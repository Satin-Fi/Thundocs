import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Area, Point } from 'react-easy-crop/types';
import { Button } from '@/components/ui/button';
import { CropArea, AspectRatio } from './CropTool';

export interface RectangleCropperProps {
  image: string;
  aspectRatio: AspectRatio;
  onCrop: (croppedImage: string) => void;
  className?: string;
}

// Utility function to create image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// Utility function to get cropped image
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set canvas size to crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.95);
  });
};

// Get aspect ratio value from AspectRatio type
const getAspectRatioValue = (aspectRatio: AspectRatio): number | undefined => {
  const ratios: Record<AspectRatio, number | undefined> = {
    free: undefined,
    square: 1,
    '4:3': 4/3,
    '16:9': 16/9,
    '3:2': 3/2,
    '9:16': 9/16,
  };
  return ratios[aspectRatio];
};

export default function RectangleCropper({
  image,
  aspectRatio,
  onCrop,
  className = '',
}: RectangleCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        const croppedImageUrl = URL.createObjectURL(croppedImage);
        onCrop(croppedImageUrl);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const aspectRatioValue = getAspectRatioValue(aspectRatio);

  return (
    <div className={`rectangle-cropper relative w-full h-full ${className}`}>
      {/* Cropper */}
      <div className="relative w-full h-full">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatioValue}
          onCropChange={onCropChange}
          onCropComplete={onCropComplete}
          onZoomChange={onZoomChange}
          style={{
            containerStyle: {
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a',
              borderRadius: '0.5rem',
            },
            cropAreaStyle: {
              border: '2px solid #3b82f6',
              borderRadius: '4px',
            },
          }}
        />

        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button
            onClick={handleApplyCrop}
            disabled={!croppedAreaPixels || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg"
          >
            {isProcessing ? 'Processing...' : 'Apply Crop'}
          </Button>
        </div>

        {/* Zoom Control */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black bg-opacity-50 rounded-lg p-3">
            <label className="block text-sm font-medium text-white mb-2">
              Zoom: {zoom.toFixed(1)}x
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Export utilities
export { getCroppedImg, createImage, getAspectRatioValue };