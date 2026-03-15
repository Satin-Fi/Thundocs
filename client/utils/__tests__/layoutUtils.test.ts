import { describe, it, expect } from "vitest";
import { getPaperAspectRatio, getRotationFitScale, getRotatedBounds, getContainScale, getImageInsetPercent } from "../layoutUtils";

describe("layoutUtils", () => {
  it("returns correct paper aspect ratios", () => {
    expect(getPaperAspectRatio("A4")).toBeCloseTo(210 / 297, 5);
    expect(getPaperAspectRatio("Legal")).toBeCloseTo(215.9 / 355.6, 5);
    expect(getPaperAspectRatio("Letter")).toBeCloseTo(215.9 / 279.4, 5);
    expect(getPaperAspectRatio("Fit")).toBeCloseTo(210 / 297, 5);
  });

  it("keeps scale at 1 for zero rotation", () => {
    const scale = getRotationFitScale(400, 200, 0, getPaperAspectRatio("A4"));
    expect(scale).toBeCloseTo(1, 5);
  });

  it("fits rotated bounds within container", () => {
    const aspect = getPaperAspectRatio("A4");
    const containerWidth = 1;
    const containerHeight = 1 / aspect;
    const baseScale = getContainScale(800, 500, containerWidth, containerHeight);
    const fittedW = 800 * baseScale;
    const fittedH = 500 * baseScale;
    const extraScale = getRotationFitScale(800, 500, 45, aspect);
    const rotated = getRotatedBounds(fittedW * extraScale, fittedH * extraScale, 45);

    expect(rotated.width).toBeLessThanOrEqual(containerWidth + 1e-6);
    expect(rotated.height).toBeLessThanOrEqual(containerHeight + 1e-6);
  });

  it("computes inset percentages within container bounds", () => {
    const aspect = getPaperAspectRatio("A4");
    const inset = getImageInsetPercent(800, 500, 0, aspect);
    expect(inset.xPct).toBeGreaterThanOrEqual(0);
    expect(inset.yPct).toBeGreaterThanOrEqual(0);
    expect(inset.xPct).toBeLessThanOrEqual(50);
    expect(inset.yPct).toBeLessThanOrEqual(50);
  });
});
