export type PaperSize = "A4" | "Legal" | "Letter" | "Fit";

export const getPaperAspectRatio = (size: PaperSize) => {
  if (size === "Legal") return 215.9 / 355.6;
  if (size === "Letter") return 215.9 / 279.4;
  return 210 / 297;
};

export const getRotatedBounds = (width: number, height: number, rotation: number) => {
  const radians = ((rotation % 360) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
};

export const getContainScale = (width: number, height: number, containerWidth: number, containerHeight: number) => {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(containerWidth / width, containerHeight / height);
};

export const getRotationFitScale = (
  width: number,
  height: number,
  rotation: number,
  containerAspect: number
) => {
  if (width <= 0 || height <= 0 || containerAspect <= 0) return 1;
  const containerWidth = 1;
  const containerHeight = 1 / containerAspect;
  const baseScale = getContainScale(width, height, containerWidth, containerHeight);
  const fittedWidth = width * baseScale;
  const fittedHeight = height * baseScale;
  const rotated = getRotatedBounds(fittedWidth, fittedHeight, rotation);
  return getContainScale(rotated.width, rotated.height, containerWidth, containerHeight);
};

export const getImageInsetPercent = (
  width: number,
  height: number,
  rotation: number,
  containerAspect: number
) => {
  if (width <= 0 || height <= 0 || containerAspect <= 0) {
    return { xPct: 0, yPct: 0 };
  }

  const containerWidth = 1;
  const containerHeight = 1 / containerAspect;
  const baseScale = getContainScale(width, height, containerWidth, containerHeight);
  const extraScale = getRotationFitScale(width, height, rotation, containerAspect);
  const finalScale = baseScale * extraScale;
  const rotated = getRotatedBounds(width * finalScale, height * finalScale, rotation);
  const insetX = Math.max(0, (containerWidth - rotated.width) / 2);
  const insetY = Math.max(0, (containerHeight - rotated.height) / 2);

  return {
    xPct: (insetX / containerWidth) * 100,
    yPct: (insetY / containerHeight) * 100,
  };
};
