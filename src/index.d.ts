export interface GraphData<N = NodeObject, L = LinkObject<N>> {
  nodes: N[];
  links: L[];
}

export interface NodeObject {
  id?: string | number;
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface LinkObject<N = NodeObject> {
  source?: string | number | N;
  target?: string | number | N;
}

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type NodeAccessor<T, N> = Accessor<N, T>;
type LinkAccessor<T, N, L> = Accessor<L, T>;

type CanvasCustomRenderMode = 'replace' | 'before' | 'after';
export type CanvasCustomRenderModeFn<T> = (obj: T) => CanvasCustomRenderMode | any;
export type CanvasCustomRenderFn<T> = (obj: T, canvasContext: CanvasRenderingContext2D, globalScale: number) => void;
export type CanvasPointerAreaPaintFn<T> = (obj: T, paintColor: string, canvasContext: CanvasRenderingContext2D, globalScale: number) => void;

type DagMode = 'td' | 'bu' | 'lr' | 'rl' | 'radialout' | 'radialin';

interface ForceFn<N = NodeObject> {
  (alpha: number): void;
  initialize?: (nodes: N[], ...args: any[]) => void;
  [key: string]: any;
}

export interface ForceGraphGenericInstance<ChainableInstance, N extends NodeObject = NodeObject, L extends LinkObject<N> = LinkObject<N>> {
  (element: HTMLElement): ChainableInstance;
  resetProps(): ChainableInstance;
  _destructor(): void;

  // Data input
  graphData(): GraphData<N, L>;
  graphData(data: GraphData<N, L>): ChainableInstance;
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
  nodeVal(): NodeAccessor<number, N>;
  nodeVal(valAccessor: NodeAccessor<number, N>): ChainableInstance;
  nodeLabel(): NodeAccessor<string, N>;
  nodeLabel(labelAccessor: NodeAccessor<string, N>): ChainableInstance;
  nodeVisibility(): NodeAccessor<boolean, N>;
  nodeVisibility(visibilityAccessor: NodeAccessor<boolean, N>): ChainableInstance;
  nodeColor(): NodeAccessor<string, N>;
  nodeColor(colorAccessor: NodeAccessor<string, N>): ChainableInstance;
  nodeAutoColorBy(): NodeAccessor<string | null, N>;
  nodeAutoColorBy(colorByAccessor: NodeAccessor<string | null, N>): ChainableInstance;
  nodeCanvasObject(): CanvasCustomRenderFn<N>;
  nodeCanvasObject(renderFn: CanvasCustomRenderFn<N>): ChainableInstance;
  nodeCanvasObjectMode(): string | CanvasCustomRenderModeFn<N>;
  nodeCanvasObjectMode(modeAccessor: string | CanvasCustomRenderModeFn<N>): ChainableInstance;
  nodePointerAreaPaint(): CanvasPointerAreaPaintFn<N>;
  nodePointerAreaPaint(renderFn: CanvasPointerAreaPaintFn<N>): ChainableInstance;

  // Link styling
  linkLabel(): LinkAccessor<string, N, L>;
  linkLabel(labelAccessor: LinkAccessor<string, N, L>): ChainableInstance;
  linkVisibility(): LinkAccessor<boolean, N, L>;
  linkVisibility(visibilityAccessor: LinkAccessor<boolean, N, L>): ChainableInstance;
  linkColor(): LinkAccessor<string, N, L>;
  linkColor(colorAccessor: LinkAccessor<string, N, L>): ChainableInstance;
  linkAutoColorBy(): LinkAccessor<string | null, N, L>;
  linkAutoColorBy(colorByAccessor: LinkAccessor<string | null, N, L>): ChainableInstance;
  linkLineDash(): LinkAccessor<number[] | null, N, L>;
  linkLineDash(linkLineDashAccessor: LinkAccessor<number[] | null, N, L>): ChainableInstance;
  linkWidth(): LinkAccessor<number, N, L>;
  linkWidth(widthAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkCurvature(): LinkAccessor<number, N, L>;
  linkCurvature(curvatureAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkCanvasObject(): CanvasCustomRenderFn<L>;
  linkCanvasObject(renderFn: CanvasCustomRenderFn<L>): ChainableInstance;
  linkCanvasObjectMode(): string | CanvasCustomRenderModeFn<L>;
  linkCanvasObjectMode(modeAccessor: string | CanvasCustomRenderModeFn<L>): ChainableInstance;
  linkDirectionalArrowLength(): LinkAccessor<number, N, L>;
  linkDirectionalArrowLength(lengthAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkDirectionalArrowColor(): LinkAccessor<string, N, L>;
  linkDirectionalArrowColor(colorAccessor: LinkAccessor<string, N, L>): ChainableInstance;
  linkDirectionalArrowRelPos(): LinkAccessor<number, N, L>;
  linkDirectionalArrowRelPos(fractionAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkDirectionalParticles(): LinkAccessor<number, N, L>;
  linkDirectionalParticles(numParticlesAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkDirectionalParticleSpeed(): LinkAccessor<number, N, L>;
  linkDirectionalParticleSpeed(relDistancePerFrameAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkDirectionalParticleWidth(): LinkAccessor<number, N, L>;
  linkDirectionalParticleWidth(widthAccessor: LinkAccessor<number, N, L>): ChainableInstance;
  linkDirectionalParticleColor(): LinkAccessor<string, N, L>;
  linkDirectionalParticleColor(colorAccessor: LinkAccessor<string, N, L>): ChainableInstance;
  emitParticle(link: L): ChainableInstance;
  linkPointerAreaPaint(): CanvasPointerAreaPaintFn<L>;
  linkPointerAreaPaint(renderFn: CanvasPointerAreaPaintFn<L>): ChainableInstance;

  // Render control
  autoPauseRedraw(): boolean;
  autoPauseRedraw(enable?: boolean): ChainableInstance;
  pauseAnimation(): ChainableInstance;
  resumeAnimation(): ChainableInstance;
  centerAt(): {x: number, y: number};
  centerAt(x?: number, y?: number, durationMs?: number): ChainableInstance;
  zoom(): number;
  zoom(scale: number, durationMs?: number): ChainableInstance;
  zoomToFit(durationMs?: number, padding?: number, nodeFilter?: (node: N) => boolean): ChainableInstance;
  minZoom(): number;
  minZoom(scale: number): ChainableInstance;
  maxZoom(): number;
  maxZoom(scale: number): ChainableInstance;
  onRenderFramePre(callback: (canvasContext: CanvasRenderingContext2D, globalScale: number) => void): ChainableInstance;
  onRenderFramePost(callback: (canvasContext: CanvasRenderingContext2D, globalScale: number) => void): ChainableInstance;

  // Force engine (d3-force) configuration
  dagMode(): DagMode | null;
  dagMode(mode: DagMode | null): ChainableInstance;
  dagLevelDistance(): number | null;
  dagLevelDistance(distance: number): ChainableInstance;
  dagNodeFilter(): (node: N) => boolean;
  dagNodeFilter(filterFn: (node: N) => boolean): ChainableInstance;
  onDagError(): (loopNodeIds: (string | number)[]) => void;
  onDagError(errorHandleFn: (loopNodeIds: (string | number)[]) => void): ChainableInstance;
  d3AlphaMin(): number;
  d3AlphaMin(alphaMin: number): ChainableInstance;
  d3AlphaDecay(): number;
  d3AlphaDecay(alphaDecay: number): ChainableInstance;
  d3VelocityDecay(): number;
  d3VelocityDecay(velocityDecay: number): ChainableInstance;
  d3Force(forceName: 'link' | 'charge' | 'center' | string): ForceFn<N> | undefined;
  d3Force(forceName: 'link' | 'charge' | 'center' | string, forceFn: ForceFn<N> | null): ChainableInstance;
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
  onNodeClick(callback: (node: N, event: MouseEvent) => void): ChainableInstance;
  onNodeRightClick(callback: (node: N, event: MouseEvent) => void): ChainableInstance;
  onNodeHover(callback: (node: N | null, previousNode: N | null) => void): ChainableInstance;
  onNodeDrag(callback: (node: N, translate: { x: number, y: number }) => void): ChainableInstance;
  onNodeDragEnd(callback: (node: N, translate: { x: number, y: number }) => void): ChainableInstance;
  onLinkClick(callback: (link: L, event: MouseEvent) => void): ChainableInstance;
  onLinkRightClick(callback: (link: L, event: MouseEvent) => void): ChainableInstance;
  onLinkHover(callback: (link: L | null, previousLink: L | null) => void): ChainableInstance;
  linkHoverPrecision(): number;
  linkHoverPrecision(precision: number): ChainableInstance;
  onBackgroundClick(callback: (event: MouseEvent) => void): ChainableInstance;
  onBackgroundRightClick(callback: (event: MouseEvent) => void): ChainableInstance;
  onZoom(callback: (transform: {k: number, x: number, y: number}) => void): ChainableInstance;
  onZoomEnd(callback: (transform: {k: number, x: number, y: number}) => void): ChainableInstance;
  enableNodeDrag(): boolean;
  enableNodeDrag(enable: boolean): ChainableInstance;
  enableZoomInteraction(): boolean;
  enableZoomInteraction(enable: boolean | ((event: MouseEvent) => boolean)): ChainableInstance;
  enablePanInteraction(): boolean;
  enablePanInteraction(enable: boolean | ((event: MouseEvent) => boolean)): ChainableInstance;
  enablePointerInteraction(): boolean;
  enablePointerInteraction(enable?: boolean): ChainableInstance;

  // Utility
  getGraphBbox(nodeFilter?: (node: N) => boolean): { x: [number, number], y: [number, number] };
  screen2GraphCoords(x: number, y: number): { x: number, y: number };
  graph2ScreenCoords(x: number, y: number): { x: number, y: number };
}

export type ForceGraphInstance<NodeType = NodeObject, LinkType = LinkObject<NodeType>> = ForceGraphGenericInstance<ForceGraphInstance<NodeType, LinkType>, NodeType, LinkType>;

declare function ForceGraph<NodeType = NodeObject, LinkType = LinkObject<NodeType>>(): ForceGraphInstance<NodeType, LinkType>;

export default ForceGraph;
