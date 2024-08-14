export interface TypedGraphData<N extends NodeObject, L extends TypedLinkObject<N>> {
  nodes: N[];
  links: L[];
}
export interface GraphData extends TypedGraphData<NodeObject, TypedLinkObject<NodeObject>> {}

export interface NodeObject {
  id?: string | number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface TypedLinkObject<N extends NodeObject> {
  source?: string | number | N;
  target?: string | number | N;
}
export interface LinkObject extends TypedLinkObject<NodeObject> {}

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type NodeAccessor<N extends NodeObject, T> = Accessor<N, T>;
type LinkAccessor<N extends NodeObject, L extends TypedLinkObject<N>, T> = Accessor<L, T>;

type CanvasCustomRenderMode = 'replace' | 'before' | 'after';
export type CanvasCustomRenderModeFn<T> = (obj: T) => CanvasCustomRenderMode | any;
export type CanvasCustomRenderFn<T> = (obj: T, canvasContext: CanvasRenderingContext2D, globalScale: number) => void;
export type CanvasPointerAreaPaintFn<T> = (obj: T, paintColor: string, canvasContext: CanvasRenderingContext2D, globalScale: number) => void;

type DagMode = 'td' | 'bu' | 'lr' | 'rl' | 'radialout' | 'radialin';

interface ForceFn {
  (alpha: number): void;
  initialize?: (nodes: NodeObject[], ...args: any[]) => void;
  [key: string]: any;
}

export interface FullTypedForceGraphGenericInstance<
    N extends NodeObject,
    L extends TypedLinkObject<N>,
    D extends TypedGraphData<N, L>,
    ChainableInstance
> {
  (element: HTMLElement): ChainableInstance;
  resetProps(): ChainableInstance;
  _destructor(): void;

  // Data input
  graphData(): D;
  graphData(data: D): ChainableInstance;
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
  nodeVal(): NodeAccessor<N, number>;
  nodeVal(valAccessor: NodeAccessor<N, number>): ChainableInstance;
  nodeLabel(): NodeAccessor<N, string>;
  nodeLabel(labelAccessor: NodeAccessor<N, string>): ChainableInstance;
  nodeVisibility(): NodeAccessor<N, boolean>;
  nodeVisibility(visibilityAccessor: NodeAccessor<N, boolean>): ChainableInstance;
  nodeColor(): NodeAccessor<N, string>;
  nodeColor(colorAccessor: NodeAccessor<N, string>): ChainableInstance;
  nodeAutoColorBy(): NodeAccessor<N, string | null>;
  nodeAutoColorBy(colorByAccessor: NodeAccessor<N, string | null>): ChainableInstance;
  nodeCanvasObject(): CanvasCustomRenderFn<N>;
  nodeCanvasObject(renderFn: CanvasCustomRenderFn<N>): ChainableInstance;
  nodeCanvasObjectMode(): string | CanvasCustomRenderModeFn<N>;
  nodeCanvasObjectMode(modeAccessor: string | CanvasCustomRenderModeFn<N>): ChainableInstance;
  nodePointerAreaPaint(): CanvasPointerAreaPaintFn<N>;
  nodePointerAreaPaint(renderFn: CanvasPointerAreaPaintFn<N>): ChainableInstance;

  // Link styling
  linkLabel(): LinkAccessor<N, L, string>;
  linkLabel(labelAccessor: LinkAccessor<N, L, string>): ChainableInstance;
  linkVisibility(): LinkAccessor<N, L, boolean>;
  linkVisibility(visibilityAccessor: LinkAccessor<N, L, boolean>): ChainableInstance;
  linkColor(): LinkAccessor<N, L, string>;
  linkColor(colorAccessor: LinkAccessor<N, L, string>): ChainableInstance;
  linkAutoColorBy(): LinkAccessor<N, L, string | null>;
  linkAutoColorBy(colorByAccessor: LinkAccessor<N, L, string | null>): ChainableInstance;
  linkLineDash(): LinkAccessor<N, L, number[] | null>;
  linkLineDash(linkLineDashAccessor: LinkAccessor<N, L, number[] | null>): ChainableInstance;
  linkWidth(): LinkAccessor<N, L, number>;
  linkWidth(widthAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkCurvature(): LinkAccessor<N, L, number>;
  linkCurvature(curvatureAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkCanvasObject(): CanvasCustomRenderFn<L>;
  linkCanvasObject(renderFn: CanvasCustomRenderFn<L>): ChainableInstance;
  linkCanvasObjectMode(): string | CanvasCustomRenderModeFn<L>;
  linkCanvasObjectMode(modeAccessor: string | CanvasCustomRenderModeFn<L>): ChainableInstance;
  linkDirectionalArrowLength(): LinkAccessor<N, L, number>;
  linkDirectionalArrowLength(lengthAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkDirectionalArrowColor(): LinkAccessor<N, L, string>;
  linkDirectionalArrowColor(colorAccessor: LinkAccessor<N, L, string>): ChainableInstance;
  linkDirectionalArrowRelPos(): LinkAccessor<N, L, number>;
  linkDirectionalArrowRelPos(fractionAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkDirectionalParticles(): LinkAccessor<N, L, number>;
  linkDirectionalParticles(numParticlesAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkDirectionalParticleSpeed(): LinkAccessor<N, L, number>;
  linkDirectionalParticleSpeed(relDistancePerFrameAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkDirectionalParticleWidth(): LinkAccessor<N, L, number>;
  linkDirectionalParticleWidth(widthAccessor: LinkAccessor<N, L, number>): ChainableInstance;
  linkDirectionalParticleColor(): LinkAccessor<N, L, string>;
  linkDirectionalParticleColor(colorAccessor: LinkAccessor<N, L, string>): ChainableInstance;
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
  d3Force(forceName: 'link' | 'charge' | 'center' | string): ForceFn | undefined;
  d3Force(forceName: 'link' | 'charge' | 'center' | string, forceFn: ForceFn | null): ChainableInstance;
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
  enableZoomInteraction(enable: boolean): ChainableInstance;
  enablePanInteraction(): boolean;
  enablePanInteraction(enable: boolean): ChainableInstance;
  enablePointerInteraction(): boolean;
  enablePointerInteraction(enable?: boolean): ChainableInstance;

  // Utility
  getGraphBbox(nodeFilter?: (node: N) => boolean): { x: [number, number], y: [number, number] };
  screen2GraphCoords(x: number, y: number): { x: number, y: number };
  graph2ScreenCoords(x: number, y: number): { x: number, y: number };
}

export interface TypedForceGraphGenericInstance<
    N extends NodeObject,
    L extends TypedLinkObject<N>,
    ChainableInstance
> extends FullTypedForceGraphGenericInstance<N, L, TypedGraphData<N, L>, ChainableInstance> {}
export interface ForceGraphGenericInstance<ChainableInstance> extends FullTypedForceGraphGenericInstance<NodeObject, LinkObject, GraphData, ChainableInstance> {}

export type TypedForceGraphInstance<N extends NodeObject, L extends TypedLinkObject<N>> = TypedForceGraphGenericInstance<N, L, TypedForceGraphInstance<N, L>>;
export type ForceGraphInstance = ForceGraphGenericInstance<ForceGraphInstance>;

declare function TypedForceGraph<N extends NodeObject, L extends TypedLinkObject<N>>(): TypedForceGraphInstance<N, L>;
declare function ForceGraph(): ForceGraphInstance;

export {TypedForceGraph};
export default ForceGraph;
