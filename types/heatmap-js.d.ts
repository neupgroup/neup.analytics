declare module 'heatmap.js' {
  type HeatmapPoint = {
    x: number;
    y: number;
    value: number;
  };

  type HeatmapInstance = {
    setData(data: { max: number; data: HeatmapPoint[] }): void;
  };

  type HeatmapConfig = {
    container: HTMLElement;
    radius?: number;
    maxOpacity?: number;
    blur?: number;
    backgroundColor?: string;
    gradient?: Record<string, string>;
  };

  const h337: {
    create(config: HeatmapConfig): HeatmapInstance;
  };

  export default h337;
}
