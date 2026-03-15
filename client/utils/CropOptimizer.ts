/**
 * Smart optimizations for crop operations
 * Includes rectangular detection, caching, and performance optimizations
 */

interface CropPoint {
  x: number;
  y: number;
}

export class CropOptimizer {
  /**
   * Detect if the crop area is approximately rectangular
   * This allows us to use faster rectangular transformations
   */
  static isApproximatelyRectangular(points: CropPoint[], tolerance = 0.1): boolean {
    if (points.length !== 4) return false;
    
    // Calculate angles at each corner
    const angles = [
      this.calculateAngle(points[3], points[0], points[1]), // angle at point 0
      this.calculateAngle(points[0], points[1], points[2]), // angle at point 1
      this.calculateAngle(points[1], points[2], points[3]), // angle at point 2
      this.calculateAngle(points[2], points[3], points[0])  // angle at point 3
    ];
    
    // Check if all angles are approximately 90 degrees (π/2 radians)
    const rightAngle = Math.PI / 2;
    return angles.every(angle => 
      Math.abs(angle - rightAngle) < tolerance
    );
  }

  /**
   * Calculate angle between three points
   */
  private static calculateAngle(p1: CropPoint, p2: CropPoint, p3: CropPoint): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
  }

  /**
   * Optimize crop points for better transformation results
   */
  static optimizeCropPoints(points: CropPoint[]): CropPoint[] {
    // Ensure points are in correct order (clockwise from top-left)
    return this.orderPointsClockwise(points);
  }

  /**
   * Order points in clockwise direction starting from top-left
   */
  private static orderPointsClockwise(points: CropPoint[]): CropPoint[] {
    if (points.length !== 4) return points;
    
    // Find centroid
    const centroid = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length
    };
    
    // Sort points by angle from centroid
    const sortedPoints = points.slice().sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });
    
    // Find the top-left point (minimum x + y)
    let topLeftIndex = 0;
    let minSum = sortedPoints[0].x + sortedPoints[0].y;
    
    for (let i = 1; i < sortedPoints.length; i++) {
      const sum = sortedPoints[i].x + sortedPoints[i].y;
      if (sum < minSum) {
        minSum = sum;
        topLeftIndex = i;
      }
    }
    
    // Reorder starting from top-left
    const orderedPoints = [];
    for (let i = 0; i < 4; i++) {
      orderedPoints.push(sortedPoints[(topLeftIndex + i) % 4]);
    }
    
    return orderedPoints;
  }

  /**
   * Calculate the optimal output dimensions for a crop
   */
  static calculateOptimalDimensions(points: CropPoint[]): { width: number; height: number } {
    if (points.length !== 4) {
      throw new Error('Exactly 4 points required');
    }
    
    // Calculate distances between adjacent points
    const distances = [
      Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), // top
      Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y), // right
      Math.hypot(points[3].x - points[2].x, points[3].y - points[2].y), // bottom
      Math.hypot(points[0].x - points[3].x, points[0].y - points[3].y)  // left
    ];
    
    // Use maximum distances for width and height
    const width = Math.max(distances[0], distances[2]); // top and bottom
    const height = Math.max(distances[1], distances[3]); // right and left
    
    return { width, height };
  }

  /**
   * Validate crop points for geometric correctness
   */
  static validateCropPoints(points: CropPoint[]): boolean {
    if (points.length !== 4) return false;
    
    // Check for duplicate points
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        if (distance < 5) return false; // Points too close
      }
    }
    
    // Check for self-intersection
    return !this.isQuadrilateralSelfIntersecting(points);
  }

  /**
   * Check if quadrilateral is self-intersecting
   */
  private static isQuadrilateralSelfIntersecting(points: CropPoint[]): boolean {
    // Check if any two non-adjacent edges intersect
    const edges = [
      [points[0], points[1]],
      [points[1], points[2]],
      [points[2], points[3]],
      [points[3], points[0]]
    ];
    
    // Check edge 0 vs edge 2, and edge 1 vs edge 3
    return this.doLinesIntersect(edges[0][0], edges[0][1], edges[2][0], edges[2][1]) ||
           this.doLinesIntersect(edges[1][0], edges[1][1], edges[3][0], edges[3][1]);
  }

  /**
   * Check if two line segments intersect
   */
  private static doLinesIntersect(p1: CropPoint, q1: CropPoint, p2: CropPoint, q2: CropPoint): boolean {
    const orientation = (p: CropPoint, q: CropPoint, r: CropPoint): number => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0; // collinear
      return val > 0 ? 1 : 2; // clockwise or counterclockwise
    };
    
    const onSegment = (p: CropPoint, q: CropPoint, r: CropPoint): boolean => {
      return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
             q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    };
    
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);
    
    // General case
    if (o1 !== o2 && o3 !== o4) return true;
    
    // Special cases
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;
    
    return false;
  }

  /**
   * Calculate the area of a quadrilateral
   */
  static calculateQuadrilateralArea(points: CropPoint[]): number {
    if (points.length !== 4) return 0;
    
    // Using the shoelace formula
    let area = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }
}
