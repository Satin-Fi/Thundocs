const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const cors = require('cors');
const bodyParser = require('body-parser');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.static('merged'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

function cleanupFile(filePath) {
  setTimeout(() => {
    fs.unlink(filePath, () => {});
  }, 15 * 60 * 1000); // 15 minutes
}

// Route: Merge PDFs
app.post('/merge-pdf', upload.array('files'), async (req, res) => {
  const mergedPdf = await PDFDocument.create();

  for (let file of req.files) {
    const pdfBytes = fs.readFileSync(file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    cleanupFile(file.path);
  }

  const mergedBytes = await mergedPdf.save();
  const outputPath = `merged/merged-${Date.now()}.pdf`;
  fs.writeFileSync(outputPath, mergedBytes);

  res.download(outputPath, () => {
    cleanupFile(outputPath);
  });
});

// Route: JPG to PDF with enhanced options
app.post('/jpg-to-pdf', upload.array('images'), async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const { orientation = 'portrait', size = 'A4', margin = 20 } = req.body;
    
    // Define page dimensions based on size and orientation
    const pageDimensions = getPageDimensions(size, orientation);
    
    for (let file of req.files) {
      const imageBytes = fs.readFileSync(file.path);
      let image;
      
      // Determine image type and embed accordingly
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (['.jpg', '.jpeg'].includes(fileExt)) {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (fileExt === '.png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        // For other formats, convert to PNG first (would require additional library)
        image = await pdfDoc.embedJpg(imageBytes); // Fallback to JPG
      }
      
      // Create a page with the specified dimensions
      const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      
      // Calculate image dimensions to fit within page margins
      const maxWidth = pageDimensions.width - (margin * 2);
      const maxHeight = pageDimensions.height - (margin * 2);
      
      // Calculate scaling to fit image within available space while maintaining aspect ratio
      const scaleWidth = maxWidth / image.width;
      const scaleHeight = maxHeight / image.height;
      const scale = Math.min(scaleWidth, scaleHeight);
      
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      // Center the image on the page
      const x = (pageDimensions.width - scaledWidth) / 2;
      const y = (pageDimensions.height - scaledHeight) / 2;
      
      // Draw the image on the page
      page.drawImage(image, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight
      });
      
      cleanupFile(file.path);
    }

    const pdfBytes = await pdfDoc.save();
    const outputPath = `merged/jpgtopdf-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, pdfBytes);

    res.download(outputPath, () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error in JPG to PDF conversion:', error);
    res.status(500).json({ error: 'Failed to convert images to PDF' });
  }
});

// Helper function to get page dimensions based on size and orientation
function getPageDimensions(size, orientation) {
  const dimensions = {
    'A4': { width: 595, height: 842 },
    'A3': { width: 842, height: 1191 },
    'A5': { width: 420, height: 595 },
    'Letter': { width: 612, height: 792 },
    'Legal': { width: 612, height: 1008 }
  };
  
  const pageDim = dimensions[size] || dimensions['A4'];
  
  return orientation === 'landscape' 
    ? { width: pageDim.height, height: pageDim.width }
    : pageDim;
}

// Route: Add watermark to PDF
app.post('/add-watermark', upload.single('pdf'), async (req, res) => {
  try {
    const { text = 'Watermark', opacity = 0.3, fontSize = 50, color = '#000000' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }
    
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Convert hex color to RGB
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return { r, g, b };
    };
    
    const rgbColor = hexToRgb(color);
    
    // Add watermark to each page
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      page.drawText(text, {
        x: width / 2 - (text.length * fontSize) / 4,
        y: height / 2,
        size: fontSize,
        font: helveticaFont,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity: opacity,
        rotate: degrees(45),
      });
    }
    
    const watermarkedPdfBytes = await pdfDoc.save();
    const outputPath = `merged/watermarked-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, watermarkedPdfBytes);
    
    cleanupFile(req.file.path);
    
    res.download(outputPath, () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error adding watermark:', error);
    res.status(500).json({ error: 'Failed to add watermark to PDF' });
  }
});

// Route: Process multiple images with advanced options
app.post('/process-images', upload.array('images'), async (req, res) => {
  try {
    const { 
      operation = 'convert', // convert, watermark, collage
      outputFormat = 'pdf',
      watermarkText = '',
      watermarkOpacity = 0.3,
      collageLayout = '2x2',
      pageSettings = {}
    } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }
    
    let outputPath;
    
    switch (operation) {
      case 'convert':
        // Use the enhanced jpg-to-pdf logic
        // This is handled by the jpg-to-pdf endpoint
        return res.status(400).json({ error: 'Use /jpg-to-pdf endpoint for conversion' });
        
      case 'watermark':
        // Add watermark to images and convert to PDF
        outputPath = await watermarkImages(req.files, watermarkText, watermarkOpacity, pageSettings);
        break;
        
      case 'collage':
        // Create a collage of images
        outputPath = await createImageCollage(req.files, collageLayout, pageSettings);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid operation specified' });
    }
    
    // Clean up uploaded files
    req.files.forEach(file => cleanupFile(file.path));
    
    res.download(outputPath, () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

// Helper function to create degrees for rotation
function degrees(angle) {
  return angle * (Math.PI / 180);
}

// Helper function to watermark images
async function watermarkImages(files, text, opacity, pageSettings) {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageDimensions = getPageDimensions(pageSettings.size || 'A4', pageSettings.orientation || 'portrait');
  
  for (const file of files) {
    const imageBytes = fs.readFileSync(file.path);
    let image;
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg'].includes(fileExt)) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (fileExt === '.png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes); // Fallback
    }
    
    const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
    
    // Calculate image dimensions
    const margin = pageSettings.margin || 20;
    const maxWidth = pageDimensions.width - (margin * 2);
    const maxHeight = pageDimensions.height - (margin * 2);
    
    const scaleWidth = maxWidth / image.width;
    const scaleHeight = maxHeight / image.height;
    const scale = Math.min(scaleWidth, scaleHeight);
    
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    const x = (pageDimensions.width - scaledWidth) / 2;
    const y = (pageDimensions.height - scaledHeight) / 2;
    
    // Draw the image
    page.drawImage(image, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight
    });
    
    // Add watermark text
    if (text) {
      page.drawText(text, {
        x: pageDimensions.width / 2 - (text.length * 20) / 4,
        y: pageDimensions.height / 2,
        size: 40,
        font: helveticaFont,
        color: rgb(0, 0, 0),
        opacity: opacity,
        rotate: degrees(45),
      });
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = `merged/watermarked-images-${Date.now()}.pdf`;
  fs.writeFileSync(outputPath, pdfBytes);
  
  return outputPath;
}

// Helper function to create image collage
async function createImageCollage(files, layout, pageSettings) {
  const pdfDoc = await PDFDocument.create();
  const pageDimensions = getPageDimensions(pageSettings.size || 'A4', pageSettings.orientation || 'portrait');
  
  // Parse layout (e.g., '2x2', '3x3')
  const [cols, rows] = layout.split('x').map(Number);
  
  // Calculate cell dimensions
  const margin = pageSettings.margin || 20;
  const spacing = 10; // Space between images
  
  const availableWidth = pageDimensions.width - (margin * 2);
  const availableHeight = pageDimensions.height - (margin * 2);
  
  const cellWidth = (availableWidth - (spacing * (cols - 1))) / cols;
  const cellHeight = (availableHeight - (spacing * (rows - 1))) / rows;
  
  // Create pages with image grids
  let currentPage = null;
  let currentRow = 0;
  let currentCol = 0;
  
  for (let i = 0; i < files.length; i++) {
    // Create a new page if needed
    if (i % (cols * rows) === 0) {
      currentPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      currentRow = 0;
      currentCol = 0;
    }
    
    const file = files[i];
    const imageBytes = fs.readFileSync(file.path);
    let image;
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg'].includes(fileExt)) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (fileExt === '.png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes); // Fallback
    }
    
    // Calculate position in the grid
    const x = margin + (currentCol * (cellWidth + spacing));
    const y = pageDimensions.height - margin - cellHeight - (currentRow * (cellHeight + spacing));
    
    // Calculate scaling to fit cell while maintaining aspect ratio
    const scaleWidth = cellWidth / image.width;
    const scaleHeight = cellHeight / image.height;
    const scale = Math.min(scaleWidth, scaleHeight);
    
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    // Center image in its cell
    const imageX = x + (cellWidth - scaledWidth) / 2;
    const imageY = y + (cellHeight - scaledHeight) / 2;
    
    // Draw the image
    currentPage.drawImage(image, {
      x: imageX,
      y: imageY,
      width: scaledWidth,
      height: scaledHeight
    });
    
    // Move to next position in grid
    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  const outputPath = `merged/collage-${Date.now()}.pdf`;
  fs.writeFileSync(outputPath, pdfBytes);
  
  return outputPath;
}

// Route: Process single image with advanced effects
app.post('/process-single-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const {
      brightness = 1,
      contrast = 1,
      saturation = 1,
      blur = 0,
      grayscale = false,
      sepia = false,
      cropX = 0,
      cropY = 0,
      cropWidth = 100,
      cropHeight = 100,
      rotate = 0,
      flip = false,
      flop = false,
      watermarkText = '',
      watermarkOpacity = 0.3,
      watermarkPosition = 'center',
      watermarkFontSize = 40,
      watermarkColor = '#ffffff',
      outputFormat = 'jpeg',
      quality = 80
    } = req.body;

    // Read the input image
    let imageProcessor = sharp(req.file.path);

    // Apply rotation if needed
    if (rotate !== 0) {
      imageProcessor = imageProcessor.rotate(parseInt(rotate));
    }

    // Apply flips if needed
    if (flip === 'true' || flip === true) {
      imageProcessor = imageProcessor.flip();
    }
    if (flop === 'true' || flop === true) {
      imageProcessor = imageProcessor.flop();
    }

    // Get image metadata for cropping
    const metadata = await imageProcessor.metadata();
    const { width: originalWidth, height: originalHeight } = metadata;

    // Apply crop if needed (convert from percentages to pixels)
    if (cropX !== 0 || cropY !== 0 || cropWidth !== 100 || cropHeight !== 100) {
      const cropXPixels = Math.floor((parseFloat(cropX) / 100) * originalWidth);
      const cropYPixels = Math.floor((parseFloat(cropY) / 100) * originalHeight);
      const cropWidthPixels = Math.floor((parseFloat(cropWidth) / 100) * originalWidth);
      const cropHeightPixels = Math.floor((parseFloat(cropHeight) / 100) * originalHeight);

      imageProcessor = imageProcessor.extract({
        left: cropXPixels,
        top: cropYPixels,
        width: cropWidthPixels,
        height: cropHeightPixels
      });
    }

    // Apply image adjustments
    const adjustments = {};
    
    // Convert from percentage values to Sharp's expected values
    if (brightness !== 1) adjustments.brightness = parseFloat(brightness) / 100;
    if (contrast !== 1) adjustments.contrast = parseFloat(contrast) / 100;
    if (saturation !== 1) adjustments.saturation = parseFloat(saturation) / 100;
    
    if (Object.keys(adjustments).length > 0) {
      imageProcessor = imageProcessor.modulate(adjustments);
    }

    // Apply blur if needed
    if (blur > 0) {
      imageProcessor = imageProcessor.blur(parseFloat(blur));
    }

    // Apply grayscale if needed
    if (grayscale === 'true' || grayscale === true) {
      imageProcessor = imageProcessor.grayscale();
    }

    // Apply sepia effect if needed
    if (sepia === 'true' || sepia === true) {
      // Sepia is applied using a color matrix
      imageProcessor = imageProcessor.tint('#704214');
    }

    // Apply watermark if text is provided
    if (watermarkText) {
      // Create a transparent SVG with the watermark text
      const fontSize = parseInt(watermarkFontSize);
      const svgWidth = watermarkText.length * fontSize;
      const svgHeight = fontSize * 1.5;

      // Calculate position based on watermarkPosition
      let textX, textY;
      switch (watermarkPosition) {
        case 'topLeft':
          textX = 10;
          textY = fontSize;
          break;
        case 'topRight':
          textX = '100%';
          textY = fontSize;
          break;
        case 'bottomLeft':
          textX = 10;
          textY = '100%';
          break;
        case 'bottomRight':
          textX = '100%';
          textY = '100%';
          break;
        case 'center':
        default:
          textX = '50%';
          textY = '50%';
          break;
      }

      const svgText = `
        <svg width="${svgWidth}" height="${svgHeight}">
          <text 
            x="${textX}" 
            y="${textY}" 
            font-family="Arial" 
            font-size="${fontSize}px" 
            fill="${watermarkColor}" 
            fill-opacity="${watermarkOpacity}"
            text-anchor="${textX === '50%' ? 'middle' : (textX === '100%' ? 'end' : 'start')}"
            dominant-baseline="${textY === '50%' ? 'middle' : (textY === '100%' ? 'text-after-edge' : 'text-before-edge')}"
          >
            ${watermarkText}
          </text>
        </svg>
      `;

      // Composite the watermark onto the image
      const watermarkBuffer = Buffer.from(svgText);
      imageProcessor = imageProcessor.composite([
        { input: watermarkBuffer, gravity: 'center' }
      ]);
    }

    // Set output format and quality
    if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
      imageProcessor = imageProcessor.jpeg({ quality: parseInt(quality) });
    } else if (outputFormat === 'png') {
      imageProcessor = imageProcessor.png({ quality: parseInt(quality) });
    } else if (outputFormat === 'webp') {
      imageProcessor = imageProcessor.webp({ quality: parseInt(quality) });
    }

    // Process the image and save to output
    const outputPath = `merged/processed-${Date.now()}.${outputFormat}`;
    await imageProcessor.toFile(outputPath);

    // Clean up the input file
    cleanupFile(req.file.path);

    // Send the processed image as a download
    res.download(outputPath, () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Route: Apply effects to multiple images and return as ZIP
app.post('/batch-process-images', upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const {
      brightness = 1,
      contrast = 1,
      saturation = 1,
      blur = 0,
      grayscale = false,
      sepia = false,
      outputFormat = 'jpeg',
      quality = 80
    } = req.body;

    // Process each image with the same settings
    const processedPaths = [];
    for (const file of req.files) {
      let imageProcessor = sharp(file.path);

      // Apply image adjustments
      const adjustments = {};
      
      // Convert from percentage values to Sharp's expected values
      if (brightness !== 1) adjustments.brightness = parseFloat(brightness) / 100;
      if (contrast !== 1) adjustments.contrast = parseFloat(contrast) / 100;
      if (saturation !== 1) adjustments.saturation = parseFloat(saturation) / 100;
      
      if (Object.keys(adjustments).length > 0) {
        imageProcessor = imageProcessor.modulate(adjustments);
      }

      // Apply blur if needed
      if (blur > 0) {
        imageProcessor = imageProcessor.blur(parseFloat(blur));
      }

      // Apply grayscale if needed
      if (grayscale === 'true' || grayscale === true) {
        imageProcessor = imageProcessor.grayscale();
      }

      // Apply sepia effect if needed
      if (sepia === 'true' || sepia === true) {
        imageProcessor = imageProcessor.tint('#704214');
      }

      // Set output format and quality
      if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
        imageProcessor = imageProcessor.jpeg({ quality: parseInt(quality) });
      } else if (outputFormat === 'png') {
        imageProcessor = imageProcessor.png({ quality: parseInt(quality) });
      } else if (outputFormat === 'webp') {
        imageProcessor = imageProcessor.webp({ quality: parseInt(quality) });
      }

      // Process the image and save to output
      const outputPath = `merged/processed-${Date.now()}-${path.basename(file.originalname)}.${outputFormat}`;
      await imageProcessor.toFile(outputPath);
      processedPaths.push(outputPath);

      // Clean up the input file
      cleanupFile(file.path);
    }

    // If only one image was processed, send it directly
    if (processedPaths.length === 1) {
      res.download(processedPaths[0], () => {
        cleanupFile(processedPaths[0]);
      });
      return;
    }

    // For multiple images, we would ideally create a ZIP file
    // This would require an additional library like 'archiver'
    // For now, we'll just send the first image with a message
    res.download(processedPaths[0], () => {
      // Clean up all processed files
      processedPaths.forEach(path => cleanupFile(path));
    });
  } catch (error) {
    console.error('Error batch processing images:', error);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

app.listen(3001, () => {
  console.log('PDF tools backend running on http://localhost:3001');
});
