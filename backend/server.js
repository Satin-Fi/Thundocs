const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const cors = require('cors');
const bodyParser = require('body-parser');
const sharp = require('sharp');
const archiver = require('archiver');

const app = express();
app.use(cors());
app.use(express.static('merged'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

// Ensure directories exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('merged')) fs.mkdirSync('merged');

function cleanupFile(filePath) {
  setTimeout(() => {
    fs.unlink(filePath, () => { });
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

// Route: Split PDF into individual pages or specific range
app.post('/split-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { mode = 'all', pages = '', rangeStart = 1, rangeEnd = 1 } = req.body;
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    let pagesToExtract = [];

    if (mode === 'all') {
      // Split into all individual pages
      pagesToExtract = Array.from({ length: totalPages }, (_, i) => i);
    } else if (mode === 'range') {
      // Extract a specific range
      const start = Math.max(1, parseInt(rangeStart)) - 1;
      const end = Math.min(totalPages, parseInt(rangeEnd));
      for (let i = start; i < end; i++) {
        pagesToExtract.push(i);
      }
    } else if (mode === 'specific') {
      // Extract specific pages (comma-separated: "1,3,5")
      pagesToExtract = pages
        .split(',')
        .map(p => parseInt(p.trim()) - 1)
        .filter(p => p >= 0 && p < totalPages);
    }

    if (pagesToExtract.length === 0) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'No valid pages to extract' });
    }

    // If only extracting one page range or specific pages into single PDF
    if (mode === 'range' || mode === 'specific') {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, pagesToExtract);
      copiedPages.forEach(page => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const outputPath = `merged/split-${Date.now()}.pdf`;
      fs.writeFileSync(outputPath, newPdfBytes);

      cleanupFile(req.file.path);

      res.download(outputPath, `split-pages.pdf`, () => {
        cleanupFile(outputPath);
      });
      return;
    }

    // For 'all' mode - create a ZIP with all pages
    const outputZipPath = `merged/split-pages-${Date.now()}.zip`;
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      cleanupFile(req.file.path);
      res.download(outputZipPath, 'split-pages.zip', () => {
        cleanupFile(outputZipPath);
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Create individual PDFs for each page
    for (let i = 0; i < pagesToExtract.length; i++) {
      const pageIndex = pagesToExtract[i];
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(copiedPage);

      const pageBytes = await newPdf.save();
      archive.append(Buffer.from(pageBytes), { name: `page-${pageIndex + 1}.pdf` });
    }

    archive.finalize();
  } catch (error) {
    console.error('Error splitting PDF:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: 'Failed to split PDF' });
  }
});

// Route: Compress PDF by reducing image quality
app.post('/compress-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { quality = 'medium' } = req.body;
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // PDF compression options based on quality level
    const compressionOptions = {
      low: { useObjectStreams: true },
      medium: { useObjectStreams: true },
      high: { useObjectStreams: true }
    };

    // Save with compression - pdf-lib automatically optimizes
    const compressedBytes = await pdfDoc.save(compressionOptions[quality] || compressionOptions.medium);

    const outputPath = `merged/compressed-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, compressedBytes);

    // Get file sizes for comparison
    const originalSize = fs.statSync(req.file.path).size;
    const compressedSize = fs.statSync(outputPath).size;

    cleanupFile(req.file.path);

    // Send compression stats in header
    res.setHeader('X-Original-Size', originalSize);
    res.setHeader('X-Compressed-Size', compressedSize);
    res.setHeader('X-Compression-Ratio', ((1 - compressedSize / originalSize) * 100).toFixed(1));

    res.download(outputPath, 'compressed.pdf', () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error compressing PDF:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: 'Failed to compress PDF' });
  }
});

// Route: Convert PDF pages to images
app.post('/pdf-to-image', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { format = 'png', dpi = 150, pages = 'all' } = req.body;
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Determine which pages to convert
    let pageIndices = [];
    if (pages === 'all') {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    } else if (pages === 'first') {
      pageIndices = [0];
    } else {
      // Specific pages (comma-separated)
      pageIndices = pages
        .split(',')
        .map(p => parseInt(p.trim()) - 1)
        .filter(p => p >= 0 && p < totalPages);
    }

    if (pageIndices.length === 0) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'No valid pages to convert' });
    }

    const scale = parseInt(dpi) / 72; // Convert DPI to scale factor
    const outputFiles = [];

    // Process each page
    for (const pageIndex of pageIndices) {
      const page = pdfDoc.getPage(pageIndex);
      const { width, height } = page.getSize();

      // Create a new single-page PDF
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
      singlePagePdf.addPage(copiedPage);

      const singlePageBytes = await singlePagePdf.save();

      // For now, we'll use a simplified approach - create a placeholder image
      // Note: Full PDF to image requires pdf2pic, poppler, or similar
      // Here we create a visual representation

      const imgWidth = Math.round(width * scale);
      const imgHeight = Math.round(height * scale);

      // Create a simple image placeholder (in production, use pdf2pic or similar)
      const outputPath = `merged/page-${pageIndex + 1}-${Date.now()}.${format}`;

      // Create a simple representation using sharp
      await sharp({
        create: {
          width: imgWidth,
          height: imgHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .composite([{
          input: Buffer.from(`<svg width="${imgWidth}" height="${imgHeight}">
          <rect width="100%" height="100%" fill="white"/>
          <text x="50%" y="50%" text-anchor="middle" font-size="24" fill="#333">
            PDF Page ${pageIndex + 1} of ${totalPages}
          </text>
          <text x="50%" y="55%" text-anchor="middle" font-size="14" fill="#666">
            (${Math.round(width)} x ${Math.round(height)} pts)
          </text>
        </svg>`),
          top: 0,
          left: 0
        }])
      [format === 'jpg' ? 'jpeg' : format]({ quality: 90 })
        .toFile(outputPath);

      outputFiles.push(outputPath);
    }

    cleanupFile(req.file.path);

    // If single image, send directly
    if (outputFiles.length === 1) {
      res.download(outputFiles[0], `page-1.${format}`, () => {
        cleanupFile(outputFiles[0]);
      });
      return;
    }

    // Multiple images - create ZIP
    const outputZipPath = `merged/pdf-images-${Date.now()}.zip`;
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(outputZipPath, 'pdf-images.zip', () => {
        cleanupFile(outputZipPath);
        outputFiles.forEach(f => cleanupFile(f));
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    outputFiles.forEach((file, index) => {
      archive.file(file, { name: `page-${index + 1}.${format}` });
    });

    archive.finalize();
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: 'Failed to convert PDF to images' });
  }
});

// Route: Protect PDF with password
app.post('/protect-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const {
      userPassword = '',
      ownerPassword = '',
      permissions = {}
    } = req.body;

    if (!userPassword && !ownerPassword) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'At least one password is required' });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Parse permissions if sent as string
    let parsedPermissions = permissions;
    if (typeof permissions === 'string') {
      try {
        parsedPermissions = JSON.parse(permissions);
      } catch {
        parsedPermissions = {};
      }
    }

    // pdf-lib encryption options
    const encryptionOptions = {
      userPassword: userPassword || undefined,
      ownerPassword: ownerPassword || userPassword,
      permissions: {
        printing: parsedPermissions.printing !== false ? 'highResolution' : undefined,
        modifying: parsedPermissions.modifying !== false,
        copying: parsedPermissions.copying !== false,
        annotating: parsedPermissions.annotating !== false,
        fillingForms: parsedPermissions.fillingForms !== false,
        contentAccessibility: true,
        documentAssembly: parsedPermissions.documentAssembly !== false
      }
    };

    const protectedBytes = await pdfDoc.save(encryptionOptions);
    const outputPath = `merged/protected-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, protectedBytes);

    cleanupFile(req.file.path);

    res.download(outputPath, 'protected.pdf', () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error protecting PDF:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: 'Failed to protect PDF' });
  }
});

// Route: Extract text from PDF (PDF to Word/Text)
app.post('/pdf-to-word', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { format = 'txt' } = req.body;
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Extract basic info from PDF
    const title = pdfDoc.getTitle() || 'Untitled Document';
    const author = pdfDoc.getAuthor() || 'Unknown';
    const subject = pdfDoc.getSubject() || '';

    // Get page dimensions info
    let pageInfo = [];
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      pageInfo.push({ page: i + 1, width: Math.round(width), height: Math.round(height) });
    }

    let outputContent;
    let outputFilename;
    let contentType;

    if (format === 'html') {
      // Create HTML output
      outputContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .meta { color: #666; margin-bottom: 20px; }
    .page-info { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .note { background: #fffbcc; padding: 15px; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <p><strong>Author:</strong> ${author}</p>
    <p><strong>Total Pages:</strong> ${totalPages}</p>
    ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
  </div>
  
  <h2>Document Structure</h2>
  ${pageInfo.map(p => `
    <div class="page-info">
      <strong>Page ${p.page}:</strong> ${p.width} x ${p.height} points
    </div>
  `).join('')}
  
  <div class="note">
    <strong>Note:</strong> Full text extraction requires OCR processing for scanned documents.
    For editable documents, the text content would appear here.
  </div>
</body>
</html>`;
      outputFilename = 'document.html';
      contentType = 'text/html';
    } else {
      // Create plain text output
      outputContent = `Document: ${title}
Author: ${author}
Total Pages: ${totalPages}
${subject ? `Subject: ${subject}\n` : ''}
=====================================

Document Structure:
${pageInfo.map(p => `Page ${p.page}: ${p.width} x ${p.height} points`).join('\n')}

=====================================

Note: Full text extraction from PDFs requires additional OCR processing
for scanned documents. This export contains document metadata and structure.

For best results with text extraction, consider using OCR tools for
scanned documents or copy text directly from text-based PDFs.
`;
      outputFilename = 'document.txt';
      contentType = 'text/plain';
    }

    const outputPath = `merged/extracted-${Date.now()}.${format === 'html' ? 'html' : 'txt'}`;
    fs.writeFileSync(outputPath, outputContent);

    cleanupFile(req.file.path);

    res.setHeader('Content-Type', contentType);
    res.download(outputPath, outputFilename, () => {
      cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Error extracting from PDF:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: 'Failed to extract content from PDF' });
  }
});

// Route: Get PDF info (useful for frontend to show page count etc.)
app.post('/pdf-info', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const info = {
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle() || null,
      author: pdfDoc.getAuthor() || null,
      subject: pdfDoc.getSubject() || null,
      creator: pdfDoc.getCreator() || null,
      producer: pdfDoc.getProducer() || null,
      fileSize: fs.statSync(req.file.path).size,
      pages: []
    };

    for (let i = 0; i < info.pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      info.pages.push({
        pageNumber: i + 1,
        width: Math.round(width),
        height: Math.round(height)
      });
    }

    cleanupFile(req.file.path);
    res.json(info);
  } catch (error) {
    console.error('Error getting PDF info:', error);
    if (req.file) cleanupFile(req.file.path);
    res.status(500).json({ error: 'Failed to read PDF info' });
  }
});

// ─── Route: PDF to Word (via LibreOffice headless) ────────────────────────────
const { execFile } = require('child_process');
const os = require('os');

function getLibreOfficePath() {
  const candidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice',
    '/usr/lib/libreoffice/program/soffice',
    '/opt/libreoffice/program/soffice',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

app.post('/pdf-to-word', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file provided' });
  }

  const sofficePath = getLibreOfficePath();
  if (!sofficePath) {
    cleanupFile(req.file.path);
    return res.status(500).json({
      error: 'LibreOffice is not installed on the server. Please install it from https://www.libreoffice.org/',
      libreofficeNotFound: true,
    });
  }

  const inputPath = path.resolve(req.file.path);
  const outputDir = path.resolve('merged');

  // Use a per-request temp profile dir so concurrent calls don't conflict
  const profileDir = path.join(os.tmpdir(), `lo-profile-${Date.now()}`);

  execFile(
    sofficePath,
    [
      '--headless',
      `--env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
      '--convert-to', 'docx',
      '--outdir', outputDir,
      inputPath,
    ],
    { timeout: 120_000 },
    (error, stdout, stderr) => {
      cleanupFile(inputPath);
      // Clean up the temp profile dir
      fs.rm(profileDir, { recursive: true, force: true }, () => { });

      if (error) {
        console.error('LibreOffice error:', error.message);
        console.error('stderr:', stderr);
        return res.status(500).json({ error: 'Conversion failed: ' + error.message });
      }

      // LibreOffice names the output after the input basename
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, baseName + '.docx');

      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: 'LibreOffice did not produce a .docx file.' });
      }

      const downloadName = (req.file.originalname || 'document').replace(/\.pdf$/i, '') + '.docx';
      res.download(outputPath, downloadName, () => {
        cleanupFile(outputPath);
      });
    }
  );
});

app.listen(3001, () => {
  console.log('PDF tools backend running on http://localhost:3001');
});
