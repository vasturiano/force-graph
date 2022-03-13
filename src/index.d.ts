export interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}

export type NodeObject = object & {
  id?: string | number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

export type LinkObject = object & {
  source?: string | number | NodeObject;
  target?: string | number | NodeObject;
};

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type NodeAccessor<T> = Accessor<NodeObject, T>;
type LinkAccessor<T> = Accessor<LinkObject, T>;

type CanvasCustomRenderMode = 'replace' | 'before' | 'after';
type CanvasCustomRenderFn<T> = (obj: T, canvasContext: CanvasRenderingContext2D, globalScale: number) => void;
type CanvasPointerAreaPaintFn<T> = (obj: T, paintColor: string, canvasContext: CanvasRenderingContext2D, globalScale: number) => void;

type DagMode = 'td' | 'bu' | 'lr' | 'rl' | 'radialout' | 'radialin';

interface ForceFn {
  (alpha: number): void;
  initialize?: (nodes: NodeObject[], ...args: any[]) => void;
  [key: string]: any;
}

export interface ForceGraphGenericInstance<ChainableInstance> {
  (element: HTMLElement): ChainableInstance;
  resetProps(): ChainableInstance;
  _destructor(): void;

  // Data input
  graphData(): GraphData;
  graphData(data: GraphData): ChainableInstance;
  nodeId(): string;
  nodeId(id: string): ChainableInstance;
  linkSource(): string;
  linkSource(source: string): ChainableInstance;
  linkTarget(): string;
  linkTarget(target: string): ChainableInstance;

  // Container layout
  width(): number;
  width(width: number): ChainableInstance;
  height(): number;
  height(height: number): ChainableInstance;
  backgroundColor(): string;
  backgroundColor(color?: string): ChainableInstance;

  // Node styling
  nodeRelSize(): number;
  nodeRelSize(size: number): ChainableInstance;
  nodeVal(): NodeAccessor<number>;
  nodeVal(valAccessor: NodeAccessor<number>): ChainableInstance;
  nodeLabel(): NodeAccessor<string>;
  nodeLabel(labelAccessor: NodeAccessor<string>): ChainableInstance;
  nodeVisibility(): NodeAccessor<boolean>;
  nodeVisibility(visibilityAccessor: NodeAccessor<boolean>): ChainableInstance;
  nodeColor(): NodeAccessor<string>;
  nodeColor(colorAccessor: NodeAccessor<string>): ChainableInstance;
  nodeAutoColorBy(): NodeAccessor<string | null>;
  nodeAutoColorBy(colorByAccessor: NodeAccessor<string | null>): ChainableInstance;
  nodeCanvasObject(): CanvasCustomRenderFn<NodeObject>;
  nodeCanvasObject(renderFn: CanvasCustomRenderFn<NodeObject>): ChainableInstance;
  nodeCanvasObjectMode(): string | ((obj: NodeObject) => CanvasCustomRenderMode | any);
  nodeCanvasObjectMode(modeAccessor: string | ((obj: NodeObject) => CanvasCustomRenderMode | any)): ChainableInstance;
  nodePointerAreaPaint(): CanvasPointerAreaPaintFn<NodeObject>;
  nodePointerAreaPaint(renderFn: CanvasPointerAreaPaintFn<NodeObject>): ChainableInstance;

  // Link styling
  linkLabel(): LinkAccessor<string>;
  linkLabel(labelAccessor: LinkAccessor<string>): ChainableInstance;
  linkVisibility(): LinkAccessor<boolean>;
  linkVisibility(visibilityAccessor: LinkAccessor<boolean>): ChainableInstance;
  linkColor(): LinkAccessor<string>;
  linkColor(colorAccessor: LinkAccessor<string>): ChainableInstance;
  linkAutoColorBy(): LinkAccessor<string | null>;
  linkAutoColorBy(colorByAccessor: LinkAccessor<string | null>): ChainableInstance;
  linkLineDash(): LinkAccessor<number[] | null>;
  linkLineDash(linkLineDashAccessor: LinkAccessor<number[] | null>): ChainableInstance;
  linkWidth(): LinkAccessor<number>;
  linkWidth(widthAccessor: LinkAccessor<number>): ChainableInstance;
  linkCurvature(): LinkAccessor<number>;
  linkCurvature(curvatureAccessor: LinkAccessor<number>): ChainableInstance;
  linkCanvasObject(): CanvasCustomRenderFn<LinkObject>;
  linkCanvasObject(renderFn: CanvasCustomRenderFn<LinkObject>): ChainableInstance;
  linkCanvasObjectMode(): string | ((obj: LinkObject) => CanvasCustomRenderMode);
  linkCanvasObjectMode(modeAccessor: string | ((obj: LinkObject) => CanvasCustomRenderMode)): ChainableInstance;
  linkDirectionalArrowLength(): LinkAccessor<number>;
  linkDirectionalArrowLength(lengthAccessor: LinkAccessor<number>): ChainableInstance;
  linkDirectionalArrowColor(): LinkAccessor<string>;
  linkDirectionalArrowColor(colorAccessor: LinkAccessor<string>): ChainableInstance;
  linkDirectionalArrowRelPos(): LinkAccessor<number>;
  linkDirectionalArrowRelPos(fractionAccessor: LinkAccessor<number>): ChainableInstance;
  linkDirectionalParticles(): LinkAccessor<number>;
  linkDirectionalParticles(numParticlesAccessor: LinkAccessor<number>): ChainableInstance;
  linkDirectionalParticleSpeed(): LinkAccessor<number>;
  linkDirectionalParticleSpeed(relDistancePerFrameAccessor: LinkAccessor<number>): ChainableInstance;
  linkDirectionalParticleWidth(): LinkAccessor<number>;
  linkDirectionalParticleWidth(widthAccessor: LinkAccessor<number>): ChainableInstance;
  linkDirectionalParticleColor(): LinkAccessor<string>;
  linkDirectionalParticleColor(colorAccessor: LinkAccessor<string>): ChainableInstance;
  emitParticle(link: LinkObject): ChainableInstance;
  linkPointerAreaPaint(): CanvasPointerAreaPaintFn<LinkObject>;
  linkPointerAreaPaint(renderFn: CanvasPointerAreaPaintFn<LinkObject>): ChainableInstance;

  // Render control
  autoPauseRedraw(): boolean;
  autoPauseRedraw(enable?: boolean): ChainableInstance;
  pauseAnimation(): ChainableInstance;
  resumeAnimation(): ChainableInstance;
  centerAt(): {x: number, y: number};
  centerAt(x?: number, y?: number, durationMs?: number): ChainableInstance;
  zoom(): number;
  zoom(scale: number, durationMs?: number): ChainableInstance;
  zoomToFit(durationMs?: number, padding?: number, nodeFilter?: (node: NodeObject) => boolean): ChainableInstance;
  minZoom(): number;
  minZoom(scale: number): ChainableInstance;
  maxZoom(): number;
  maxZoom(scale: number): ChainableInstance;
  onRenderFramePre(callback: (canvasContext: CanvasRenderingContext2D, globalScale: number) => void): ChainableInstance;
  onRenderFramePost(callback: (canvasContext: CanvasRenderingContext2D, globalScale: number) => void): ChainableInstance;

  // Force engine (d3-force) configuration
  dagMode(): DagMode;
  dagMode(mode: DagMode): ChainableInstance;
  dagLevelDistance(): number | null;
  dagLevelDistance(distance: number): ChainableInstance;
  dagNodeFilter(): (node: NodeObject) => boolean;
  dagNodeFilter(filterFn: (node: NodeObject) => boolean): ChainableInstance;
  onDagError(): (loopNodeIds: (string | number)[]) => void;
  onDagError(errorHandleFn: (loopNodeIds: (string | number)[]) => void): ChainableInstance;
  d3AlphaMin(): number;
  d3AlphaMin(alphaMin: number): ChainableInstance;
  d3AlphaDecay(): number;
  d3AlphaDecay(alphaDecay: number): ChainableInstance;
  d3VelocityDecay(): number;
  d3VelocityDecay(velocityDecay: number): ChainableInstance;
  d3Force(forceName: 'link' | 'charge' | 'center' | string): ForceFn | undefined;
  d3Force(forceName: 'link' | 'charge' | 'center' | string, forceFn: ForceFn): ChainableInstance;
  d3ReheatSimulation(): ChainableInstance;
  warmupTicks(): number;
  warmupTicks(ticks: number): ChainableInstance;
  cooldownTicks(): number;
  cooldownTicks(ticks: number): ChainableInstance;
  cooldownTime(): number;
  cooldownTime(milliseconds: number): ChainableInstance;
  onEngineTick(callback: () => void): ChainableInstance;
  onEngineStop(callback: () => void): ChainableInstance;

  // Interaction
  onNodeClick(callback: (node: NodeObject, event: MouseEvent) => void): ChainableInstance;
  onNodeRightClick(callback: (node: NodeObject, event: MouseEvent) => void): ChainableInstance;
  onNodeHover(callback: (node: NodeObject | null, previousNode: NodeObject | null) => void): ChainableInstance;
  onNodeDrag(callback: (node: NodeObject, translate: { x: number, y: number }) => void): ChainableInstance;
  onNodeDragEnd(callback: (node: NodeObject, translate: { x: number, y: number }) => void): ChainableInstance;
  onLinkClick(callback: (link: LinkObject, event: MouseEvent) => void): ChainableInstance;
  onLinkRightClick(callback: (link: LinkObject, event: MouseEvent) => void): ChainableInstance;
  onLinkHover(callback: (link: LinkObject | null, previousLink: LinkObject | null) => void): ChainableInstance;
  linkHoverPrecision(): number;
  linkHoverPrecision(precision: number): ChainableInstance;
  onBackgroundClick(callback: (event: MouseEvent) => void): ChainableInstance;
  onBackgroundRightClick(callback: (event: MouseEvent) => void): ChainableInstance;
  onZoom(callback: (transform: {k: number, x: number, y: number}) => void): ChainableInstance;
  onZoomEnd(callback: (transform: {k: number, x: number, y: number}) => void): ChainableInstance;
  enableNodeDrag(): boolean;
  enableNodeDrag(enable: boolean): ChainableInstance;
  enableZoomInteraction(): boolean;
  enableZoomInteraction(enable: boolean): ChainableInstance;
  enablePanInteraction(): boolean;
  enablePanInteraction(enable: boolean): ChainableInstance;
  enablePointerInteraction(): boolean;
  enablePointerInteraction(enable?: boolean): ChainableInstance;

  // Utility
  getGraphBbox(nodeFilter?: (node: NodeObject) => boolean): { x: [number, number], y: [number, number] };
  screen2GraphCoords(x: number, y: number): { x: number, y: number };
  graph2ScreenCoords(x: number, y: number): { x: number, y: number };
}

export type ForceGraphInstance = ForceGraphGenericInstance<ForceGraphInstance>;

declare function ForceGraph(): ForceGraphInstance;

export default ForceGraph;
