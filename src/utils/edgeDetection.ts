export interface EdgePoint {
  x: number;
  y: number;
  strength: number;
}

export interface EdgeDetectionConfig {
  sensitivity: number;
  contrastThreshold: number;
  maxDistance: number;
}

const DEFAULT_CONFIG: EdgeDetectionConfig = {
  sensitivity: 0.6,
  contrastThreshold: 30,
  maxDistance: 50,
};

export class EdgeDetector {
  constructor() {}

  extractCanvasFromMap(): ImageData | null {
    return null;
  }

  detectEdges(
    imageData: ImageData,
    config: Partial<EdgeDetectionConfig> = {}
  ): EdgePoint[] {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const edges = this.applySobelOperator(imageData);
    return this.findSignificantEdges(edges, finalConfig);
  }

  private applySobelOperator(imageData: ImageData): Uint8ClampedArray {
    const { data, width, height } = imageData;
    const edgeData = new Uint8ClampedArray(width * height);

    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const pixel = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (dy + 1) * 3 + (dx + 1);
            gx += pixel * sobelX[kernelIdx];
            gy += pixel * sobelY[kernelIdx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const edgeIdx = y * width + x;
        edgeData[edgeIdx] = Math.min(255, magnitude);
      }
    }

    return edgeData;
  }

  private findSignificantEdges(
    edgeData: Uint8ClampedArray,
    config: EdgeDetectionConfig
  ): EdgePoint[] {
    const width = Math.sqrt(edgeData.length);
    const edges: EdgePoint[] = [];
    const threshold = 255 * config.sensitivity;

    for (let i = 0; i < edgeData.length; i++) {
      if (edgeData[i] > threshold) {
        const y = Math.floor(i / width);
        const x = i % width;
        const strength = edgeData[i] / 255;

        edges.push({ x, y, strength });
      }
    }

    return this.thinEdges(edges, width);
  }

  private thinEdges(edges: EdgePoint[], width: number): EdgePoint[] {
    const thinned: EdgePoint[] = [];
    const processed = new Set<number>();
    const threshold = 5;

    for (const edge of edges) {
      if (processed.has(edge.y * width + edge.x)) continue;

      let maxEdge = edge;
      let maxStrength = edge.strength;

      for (const other of edges) {
        if (
          Math.hypot(other.x - edge.x, other.y - edge.y) <= threshold &&
          other.strength > maxStrength
        ) {
          maxEdge = other;
          maxStrength = other.strength;
        }
      }

      thinned.push(maxEdge);

      for (const other of edges) {
        if (Math.hypot(other.x - edge.x, other.y - edge.y) <= threshold) {
          processed.add(other.y * width + other.x);
        }
      }
    }

    return thinned;
  }

  findNearestEdge(
    x: number,
    y: number,
    edges: EdgePoint[],
    maxDistance: number
  ): EdgePoint | null {
    let nearest: EdgePoint | null = null;
    let minDist = maxDistance;

    for (const edge of edges) {
      const dist = Math.hypot(edge.x - x, edge.y - y);
      if (dist < minDist) {
        minDist = dist;
        nearest = edge;
      }
    }

    return nearest;
  }

  findSnapPoint(
    pixelX: number,
    pixelY: number,
    edges: EdgePoint[],
    config: Partial<EdgeDetectionConfig> = {}
  ): EdgePoint | null {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const nearest = this.findNearestEdge(pixelX, pixelY, edges, finalConfig.maxDistance);

    if (!nearest || nearest.strength < finalConfig.sensitivity) {
      return null;
    }

    return nearest;
  }
}

export const edgeDetector = new EdgeDetector();
