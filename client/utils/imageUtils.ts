
export interface FilterValues {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  highlights: number;
  shadows: number;
  sharpness: number;
  blur: number;
  warmth: number;
  tint: number;
  vignette: number;
  grayscale: number;
  invert: number;
  sepia: number;
  hueRotate: number;
}

export interface ImageWithFilters {
  filters: FilterValues;
  activeFilter?: string;
}

export const filterPresets = [
  { name: 'Original', filters: { brightness: 0, contrast: 0, saturation: 0, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 0, tint: 0, vignette: 0, grayscale: 0, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'Lighten', filters: { brightness: 30, contrast: 20, saturation: 0, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 0, tint: 0, vignette: 0, grayscale: 0, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'Magic Color', filters: { brightness: 0, contrast: 0, saturation: 0, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 0, tint: 0, vignette: 0, grayscale: 0, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'Gray', filters: { brightness: 10, contrast: 20, saturation: 0, exposure: 0, highlights: 0, shadows: 0, sharpness: 10, blur: 0, warmth: 0, tint: 0, vignette: 0, grayscale: 100, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'B&W 2', filters: { brightness: 10, contrast: 100, saturation: 0, exposure: 0, highlights: 0, shadows: 0, sharpness: 20, blur: 0, warmth: 0, tint: 0, vignette: 0, grayscale: 100, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'Whiteboard', filters: { brightness: 35, contrast: 40, saturation: 10, exposure: 0, highlights: 0, shadows: 0, sharpness: 20, blur: 0, warmth: 0, tint: 0, vignette: 0, grayscale: 0, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'Vivid', filters: { brightness: 10, contrast: 20, saturation: 30, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 0, tint: 0, vignette: 10, grayscale: 0, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'B&W', filters: { brightness: 0, contrast: 10, saturation: -100, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 0, tint: 0, vignette: 20, grayscale: 100, invert: 0, sepia: 0, hueRotate: 0 } },
  { name: 'Sepia', filters: { brightness: 10, contrast: 0, saturation: -20, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 80, tint: 0, vignette: 30, grayscale: 0, invert: 0, sepia: 80, hueRotate: 0 } },
  { name: 'Cool', filters: { brightness: 5, contrast: 5, saturation: 10, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: -20, tint: 180, vignette: 0, grayscale: 0, invert: 0, sepia: 0, hueRotate: 180 } },
  { name: 'Warm', filters: { brightness: 10, contrast: 0, saturation: 20, exposure: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, warmth: 20, tint: 30, vignette: 15, grayscale: 0, invert: 0, sepia: 20, hueRotate: 30 } },
];

export const getImageFilter = (img: ImageWithFilters, useSvg: boolean = true) => {
  const { filters, activeFilter } = img;
  
  // Get preset values if an active filter is selected
  const preset = activeFilter ? filterPresets.find(p => p.name === activeFilter) : null;
  const presetFilters = preset ? preset.filters : null;
  
  // Combine manual filters with preset filters
  const getVal = (key: keyof FilterValues) => {
    const manual = filters[key] || 0;
    const base = presetFilters ? (presetFilters[key] || 0) : 0;
    return manual + base;
  };

  // Map -100..100 UI values to CSS filter values
  const brightnessVal = 100 + getVal('brightness') + getVal('exposure');
  const contrastVal = 100 + getVal('contrast');
  const saturationVal = 100 + getVal('saturation');
  
  // Sharpness < 0 maps to Blur.
  const sharpness = getVal('sharpness');
  const blurVal = sharpness < 0 ? Math.abs(sharpness) * 0.1 : getVal('blur');
  
  const sepiaVal = Math.max(0, getVal('warmth')); // Warmth uses sepia for warming
  const hueRotateVal = getVal('hueRotate') + getVal('tint');

  const baseFilters = [
    `brightness(${Math.max(0, brightnessVal)}%)`,
    `contrast(${Math.max(0, contrastVal)}%)`,
    `saturate(${Math.max(0, saturationVal)}%)`,
    `blur(${blurVal}px)`,
    `sepia(${sepiaVal}%)`,
    `grayscale(${getVal('grayscale')}%)`,
    `hue-rotate(${hueRotateVal}deg)`,
    `invert(${getVal('invert')}%)`
  ].join(' ');

  // Magic Color is a global static filter, so we can use it even in thumbnails
  if (activeFilter === 'Magic Color') {
      // Use the preview version for thumbnails (useSvg=false) to avoid artifacts from fixed-pixel operations on small images
      return `${baseFilters} url(#${useSvg ? 'magic-color-filter' : 'magic-color-filter-preview'})`;
  }

  // Append SVG filter URL if necessary
  if (useSvg) {
    return `${baseFilters} url(#adjust-filter)`;
  }
  return baseFilters;
};

export const getVignetteStyle = (img: ImageWithFilters) => {
  const { filters, activeFilter } = img;
  const preset = activeFilter ? filterPresets.find(p => p.name === activeFilter) : null;
  const presetVignette = preset ? (preset.filters.vignette || 0) : 0;
  const manualVignette = filters.vignette || 0;
  
  const vignette = manualVignette + presetVignette;
  
  if (!vignette) return {};
  
  const color = vignette > 0 ? '0,0,0' : '255,255,255';
  const intensity = Math.abs(vignette);
  
  if (intensity === 0) return {};

  return {
    boxShadow: `inset 0 0 ${intensity * 3}px ${intensity}px rgba(${color},0.5)`
  };
};

export const getWarmthOverlayStyle = (img: ImageWithFilters) => {
  const { filters, activeFilter } = img;
  const preset = activeFilter ? filterPresets.find(p => p.name === activeFilter) : null;
  const presetWarmth = preset ? (preset.filters.warmth || 0) : 0;
  const manualWarmth = filters.warmth || 0;
  
  const warmth = manualWarmth + presetWarmth;
  
  if (warmth <= 0) {
      // Cooling: Blue overlay
      const opacity = Math.abs(warmth) / 200; // 0.5 max opacity
      return {
          backgroundColor: 'rgba(0, 100, 255, 1)',
          opacity: opacity,
          mixBlendMode: 'overlay' as const
      };
  }
  // Warming is handled by Sepia filter mostly, but we can add a slight orange overlay for better tone
  return {
      backgroundColor: 'rgba(255, 100, 0, 1)',
      opacity: warmth / 400, // Subtle
      mixBlendMode: 'overlay' as const
  };
};
