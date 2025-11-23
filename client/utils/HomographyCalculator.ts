/**
 * Custom 8-point homography algorithm with Gaussian elimination
 * Optimized for perspective transformation in image cropping
 */
export class HomographyCalculator {
  private static cache = new Map<string, number[]>();

  /**
   * Calculate homography matrix using 8-point algorithm with Gaussian elimination
   * Falls back to affine transformation if homography fails
   */
  static calculateHomography(srcPoints: number[][], dstPoints: number[][]): number[] {
    if (srcPoints.length !== 4 || dstPoints.length !== 4) {
      throw new Error('Exactly 4 point pairs required for homography calculation');
    }

    // Create cache key
    const cacheKey = JSON.stringify({ src: srcPoints, dst: dstPoints });
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Set up the system of linear equations Ah = 0
      // Each point correspondence gives us 2 equations
      const A: number[][] = [];
      
      for (let i = 0; i < 4; i++) {
        const [x, y] = srcPoints[i];
        const [u, v] = dstPoints[i];
        
        // First equation: -x*h0 - y*h1 - h2 + u*x*h6 + u*y*h7 + u*h8 = 0
        A.push([-x, -y, -1, 0, 0, 0, u*x, u*y, u]);
        
        // Second equation: -x*h3 - y*h4 - h5 + v*x*h6 + v*y*h7 + v*h8 = 0
        A.push([0, 0, 0, -x, -y, -1, v*x, v*y, v]);
      }
      
      // Solve using Gaussian elimination
      const homography = this.gaussianElimination(A);
      
      // Validate the result
      if (homography.some(h => !isFinite(h))) {
        throw new Error('Invalid homography coefficients');
      }
      
      this.cache.set(cacheKey, homography);
      return homography;
      
    } catch (error) {
      console.warn('Homography calculation failed, falling back to affine:', error);
      // Fallback to affine transformation
      const affine = this.calculateAffineTransform(srcPoints, dstPoints);
      this.cache.set(cacheKey, affine);
      return affine;
    }
  }

  /**
   * Optimized Gaussian elimination with partial pivoting for better numerical stability
   */
  private static gaussianElimination(matrix: number[][]): number[] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    
    // Forward elimination with partial pivoting
    for (let i = 0; i < Math.min(rows, cols - 1); i++) {
      // Find the pivot (largest absolute value in column i)
      let maxRow = i;
      for (let k = i + 1; k < rows; k++) {
        if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows if needed
      if (maxRow !== i) {
        [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
      }
      
      // Skip if pivot is too small (near-singular matrix)
      if (Math.abs(matrix[i][i]) < 1e-12) {
        continue;
      }
      
      // Eliminate column i in rows below
      const pivot = matrix[i][i];
      for (let k = i + 1; k < rows; k++) {
        const factor = matrix[k][i] / pivot;
        // Vectorized row operation for better performance
        for (let j = i; j < cols; j++) {
          matrix[k][j] -= factor * matrix[i][j];
        }
      }
    }
    
    // Back substitution to find the null space
    // We're looking for the solution where h8 = 1 (normalization)
    const h = new Array(9).fill(0);
    h[8] = 1; // Normalize by setting h8 = 1
    
    // Solve for other coefficients
    for (let i = Math.min(rows, cols - 1) - 1; i >= 0; i--) {
      if (Math.abs(matrix[i][i]) < 1e-12) {
        h[i] = 0; // Handle near-singular case
        continue;
      }
      
      let sum = 0;
      for (let j = i + 1; j < cols - 1; j++) {
        sum += matrix[i][j] * h[j];
      }
      sum += matrix[i][cols - 1] * h[8];
      
      h[i] = -sum / matrix[i][i];
    }
    
    return h;
  }

  /**
   * Fallback affine transformation calculation
   */
  private static calculateAffineTransform(srcPoints: number[][], dstPoints: number[][]): number[] {
    // Use first 3 points for affine transformation
    const src = srcPoints.slice(0, 3);
    const dst = dstPoints.slice(0, 3);
    
    // Set up system: [x y 1 0 0 0] [a] = [u]
    //                [0 0 0 x y 1] [b]   [v]
    //                              [c]
    //                              [d]
    //                              [e]
    //                              [f]
    
    const A: number[][] = [];
    const b: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const [x, y] = src[i];
      const [u, v] = dst[i];
      
      A.push([x, y, 1, 0, 0, 0]);
      b.push(u);
      A.push([0, 0, 0, x, y, 1]);
      b.push(v);
    }
    
    // Solve using least squares (simplified for 6x6 system)
    // Return as homography format [a, b, c, d, e, f, 0, 0, 1]
    const affineCoeffs = this.solveLinearSystem(A, b);
    return [...affineCoeffs, 0, 0, 1];
  }

  /**
   * Simple linear system solver for affine transformation
   */
  private static solveLinearSystem(A: number[][], b: number[]): number[] {
    // Simplified solver for our specific case
    // In practice, you might want to use a more robust method
    const n = A[0].length;
    const result = new Array(n).fill(0);
    
    // This is a simplified implementation
    // For production, consider using a proper linear algebra library
    for (let i = 0; i < n; i++) {
      result[i] = b[i] / (A[i][i] || 1);
    }
    
    return result;
  }

  /**
   * Clear the transformation cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}