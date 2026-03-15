import React from 'react';

export const GlobalFilters = () => {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none opacity-0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {/* Advanced Magic Color Filter (Adaptive Thresholding) 
            Global definition to allow usage in Thumbnails and Editor 
        */}
        <filter id="magic-color-filter" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            {/* 1. Estimate Background using Dilate + Blur (Morphological Closing) */}
            {/* Dilate expands bright areas (paper) over dark areas (text/borders). */}
            {/* radius="5" ensures that thin text lines are completely "eaten" by the white background. */}
            {/* This creates a background map that has NO text ghosting, preventing halos. */}
            {/* It also extends the white paper to the edge, fixing border shadows. */}
            <feMorphology operator="dilate" radius="5" in="SourceGraphic" result="dilated" />
            
            {/* Blur the dilated result to smooth out the blocky morphology artifacts */}
            <feGaussianBlur in="dilated" stdDeviation="10" result="background" edgeMode="duplicate" />

            {/* 2. Invert the Background to use as a mask for Color Dodge */}
            {/* Inverting each channel: R' = 1-R, G' = 1-G, B' = 1-B */}
            <feComponentTransfer in="background" result="invertedBackground">
                <feFuncR type="linear" slope="-1" intercept="1"/>
                <feFuncG type="linear" slope="-1" intercept="1"/>
                <feFuncB type="linear" slope="-1" intercept="1"/>
            </feComponentTransfer>

            {/* 3. Apply Color Dodge (Divide) */}
            {/* Dest (SourceGraphic) / (1 - Source (invertedBackground)) */}
            {/* Result = SourceGraphic / Background */}
            {/* This divides the image by the estimated pure-background map. */}
            <feBlend mode="color-dodge" in="invertedBackground" in2="SourceGraphic" result="divided" />

            {/* 4. Contrast Enhancement & Saturation Recovery */}
            {/* Gamma 1.5 to darken text/ink slightly without crushing blacks */}
            <feComponentTransfer in="divided" result="contrasted">
                <feFuncR type="gamma" amplitude="1" exponent="1.5" offset="0"/>
                <feFuncG type="gamma" amplitude="1" exponent="1.5" offset="0"/>
                <feFuncB type="gamma" amplitude="1" exponent="1.5" offset="0"/>
            </feComponentTransfer>

            {/* 5. Saturation Boost */}
            <feColorMatrix type="saturate" values="1.5" in="contrasted" result="saturated" />

            {/* 6. Sharpening */}
            <feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" in="saturated" result="sharpened" edgeMode="duplicate" />
            
            {/* 7. Final Cleanup: Clip to original image bounds */}
            {/* This removes any artifacts (glow/shadow) that spilled outside the original frame due to dilation/blur/sharpening */}
            <feComposite operator="in" in="sharpened" in2="SourceGraphic" />
        </filter>

        {/* Simplified Magic Color Filter for Previews/Thumbnails (Scaled down parameters) */}
        <filter id="magic-color-filter-preview" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feMorphology operator="dilate" radius="1" in="SourceGraphic" result="dilated" />
            <feGaussianBlur in="dilated" stdDeviation="2" result="background" edgeMode="duplicate" />
            <feComponentTransfer in="background" result="invertedBackground">
                <feFuncR type="linear" slope="-1" intercept="1"/>
                <feFuncG type="linear" slope="-1" intercept="1"/>
                <feFuncB type="linear" slope="-1" intercept="1"/>
            </feComponentTransfer>
            <feBlend mode="color-dodge" in="invertedBackground" in2="SourceGraphic" result="divided" />
            <feComponentTransfer in="divided" result="contrasted">
                <feFuncR type="gamma" amplitude="1" exponent="1.5" offset="0"/>
                <feFuncG type="gamma" amplitude="1" exponent="1.5" offset="0"/>
                <feFuncB type="gamma" amplitude="1" exponent="1.5" offset="0"/>
            </feComponentTransfer>
            <feColorMatrix type="saturate" values="1.5" in="contrasted" result="saturated" />
            <feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" in="saturated" result="sharpened" edgeMode="duplicate" />
            <feComposite operator="in" in="sharpened" in2="SourceGraphic" />
        </filter>
      </defs>
    </svg>
  );
};
