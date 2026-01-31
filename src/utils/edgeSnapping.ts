import { EdgeDetector, EdgePoint, type EdgeDetectionConfig } from './edgeDetection';

export type { EdgeDetectionConfig };

export interface SnapResult {
  lat: number;
  lng: number;
  snapped: boolean;
  edgeStrength: number;
}

export class EdgeSnapManager {
  private edgeDetector: EdgeDetector;
  private edges: EdgePoint[] = [];
  private canvasSize = { width: 0, height: 0 };
  private bounds: google.maps.LatLngBounds | null = null;
  private projection: google.maps.Projection | null = null;
  private edgeOverlay: HTMLCanvasElement | null = null;

  constructor() {
    this.edgeDetector = new EdgeDetector();
  }

  async analyzeMapRegion(
    mapInstance: google.maps.Map
  ): Promise<void> {
    const bounds = mapInstance.getBounds();
    const projection = mapInstance.getProjection();

    if (!bounds || !projection) return;

    this.bounds = bounds;
    this.projection = projection;

    const zoom = mapInstance.getZoom() || 12;
    this.canvasSize = {
      width: Math.min(512, 256 + zoom * 10),
      height: Math.min(512, 256 + zoom * 10),
    };

    try {
      const mapContainer = mapInstance.getDiv();
      const rect = mapContainer.getBoundingClientRect();

      this.canvasSize.width = Math.min(512, rect.width);
      this.canvasSize.height = Math.min(512, rect.height);

      this.createEdgeOverlay();
      await this.detectEdgesInRegion();
    } catch (err) {
      console.error('Failed to analyze map region:', err);
    }
  }

  private createEdgeOverlay(): void {
    if (this.edgeOverlay) {
      this.edgeOverlay.remove();
    }

    this.edgeOverlay = document.createElement('canvas');
    this.edgeOverlay.width = this.canvasSize.width;
    this.edgeOverlay.height = this.canvasSize.height;
    this.edgeOverlay.style.position = 'absolute';
    this.edgeOverlay.style.top = '0';
    this.edgeOverlay.style.left = '0';
    this.edgeOverlay.style.opacity = '0.3';
    this.edgeOverlay.style.pointerEvents = 'none';
    this.edgeOverlay.style.display = 'none';
    this.edgeOverlay.style.zIndex = '1';
  }

  private detectEdgesInRegion(): Promise<void> {
    return Promise.resolve();
  }


  showEdgeOverlay(show: boolean): void {
    if (this.edgeOverlay) {
      this.edgeOverlay.style.display = show ? 'block' : 'none';
    }
  }

  snapVertexToEdge(
    latLng: google.maps.LatLng,
    config: Partial<EdgeDetectionConfig> = {}
  ): SnapResult {
    if (!this.bounds || !this.projection || this.edges.length === 0) {
      return { lat: latLng.lat(), lng: latLng.lng(), snapped: false, edgeStrength: 0 };
    }

    const worldPoint = this.projection.fromLatLngToPoint(latLng);
    if (!worldPoint) {
      return { lat: latLng.lat(), lng: latLng.lng(), snapped: false, edgeStrength: 0 };
    }

    const boundsNE = this.projection.fromLatLngToPoint(this.bounds.getNorthEast());
    const boundsSW = this.projection.fromLatLngToPoint(this.bounds.getSouthWest());

    if (!boundsNE || !boundsSW) {
      return { lat: latLng.lat(), lng: latLng.lng(), snapped: false, edgeStrength: 0 };
    }

    const pixelX = Math.round(
      ((worldPoint.x - boundsSW.x) / (boundsNE.x - boundsSW.x)) * this.canvasSize.width
    );
    const pixelY = Math.round(
      ((worldPoint.y - boundsNE.y) / (boundsSW.y - boundsNE.y)) * this.canvasSize.height
    );

    const snapPoint = this.edgeDetector.findSnapPoint(pixelX, pixelY, this.edges, config);

    if (!snapPoint) {
      return { lat: latLng.lat(), lng: latLng.lng(), snapped: false, edgeStrength: 0 };
    }

    const snappedLatLng = this.projection.fromPointToLatLng(
      new google.maps.Point(
        boundsSW.x + (snapPoint.x / this.canvasSize.width) * (boundsNE.x - boundsSW.x),
        boundsNE.y + (snapPoint.y / this.canvasSize.height) * (boundsSW.y - boundsNE.y)
      )
    );

    if (!snappedLatLng) {
      return { lat: latLng.lat(), lng: latLng.lng(), snapped: false, edgeStrength: 0 };
    }

    return {
      lat: snappedLatLng.lat(),
      lng: snappedLatLng.lng(),
      snapped: true,
      edgeStrength: snapPoint.strength,
    };
  }

  clearEdges(): void {
    this.edges = [];
    if (this.edgeOverlay) {
      this.edgeOverlay.remove();
      this.edgeOverlay = null;
    }
  }

  getEdgeCount(): number {
    return this.edges.length;
  }
}

export const edgeSnapManager = new EdgeSnapManager();
