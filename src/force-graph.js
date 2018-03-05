import { select as d3Select } from 'd3-selection';
import { zoom as d3Zoom, zoomTransform as d3ZoomTransform } from 'd3-zoom';
import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { int2HexColor, rgb2Int } from './color-utils.js';
import CanvasForceGraph from './canvas-force-graph';
import linkKapsule from './kapsule-link.js';

const ZOOM2NODES_FACTOR = 4;

// Expose config from forceGraph
const bindFG = linkKapsule('forceGraph', CanvasForceGraph);
const bindBoth = linkKapsule(['forceGraph', 'shadowGraph'], CanvasForceGraph);
const linkedProps = Object.assign(
  ...[
    'nodeColor',
    'nodeAutoColorBy',
    'nodeCanvasObject',
    'linkColor',
    'linkAutoColorBy',
    'linkWidth',
    'linkDirectionalParticles',
    'linkDirectionalParticleSpeed',
    'linkDirectionalParticleWidth',
    'linkDirectionalParticleColor',
    'd3AlphaDecay',
    'd3VelocityDecay',
    'warmupTicks',
    'cooldownTicks',
    'cooldownTime'
  ].map(p => ({ [p]: bindFG.linkProp(p)})),
  ...[
    'nodeRelSize',
    'nodeId',
    'nodeVal',
    'linkSource',
    'linkTarget'
  ].map(p => ({ [p]: bindBoth.linkProp(p)}))
);
const linkedMethods = Object.assign(...[
  'd3Force'
].map(p => ({ [p]: bindFG.linkMethod(p)})));

function adjustCanvasSize(state) {
  if (state.canvas) {
    let curWidth = state.canvas.width;
    let curHeight = state.canvas.height;
    if (curWidth === 300 && curHeight === 150) { // Default canvas dimensions
      curWidth = curHeight = 0;
    }

    // Resize canvases
    [state.canvas, state.shadowCanvas].forEach(canvas => {
      canvas.width = state.width;
      canvas.height = state.height;
    });

    // Relative center panning based on 0,0
    const k = d3ZoomTransform(state.canvas).k;
    state.zoom.translateBy(state.zoom.__baseElem,
      (state.width - curWidth) / 2 / k,
      (state.height - curHeight) / 2 / k
    );
  }
}

//

export default Kapsule({
  props:{
    width: { default: window.innerWidth, onChange: (_, state) => adjustCanvasSize(state), triggerUpdate: false } ,
    height: { default: window.innerHeight, onChange: (_, state) => adjustCanvasSize(state), triggerUpdate: false },
    graphData: {
      default: { nodes: [], links: [] },
      onChange: ((d, state) => {
        if (d.nodes.length || d.links.length) {
          console.info('force-graph loading', d.nodes.length + ' nodes', d.links.length + ' links');
        }

        hexIndex([...d.nodes, ...d.links]);
        state.forceGraph.graphData(d);
        state.shadowGraph.graphData(d);

        function hexIndex(objs) {
          objs
            .filter(obj => !obj.hasOwnProperty('__indexColor'))
            .forEach(obj => {
              // index per color hex key
              obj.__indexColor = int2HexColor(state.objs.length);
              state.objs.push(obj);
            });
        }
      }),
      triggerUpdate: false
    },
    backgroundColor: { onChange(color, state) { state.canvas && color && (state.canvas.style.background = color) }, triggerUpdate: false },
    nodeLabel: { default: 'name', triggerUpdate: false },
    linkLabel: { default: 'name', triggerUpdate: false },
    linkHoverPrecision: { default: 4, triggerUpdate: false },
    enablePointerInteraction: { default: true, onChange(_, state) { state.onHover = null; }, triggerUpdate: false },
    onNodeClick: { default: () => {}, triggerUpdate: false },
    onNodeHover: { default: () => {}, triggerUpdate: false },
    onLinkClick: { default: () => {}, triggerUpdate: false },
    onLinkHover: { default: () => {}, triggerUpdate: false },
    ...linkedProps
  },

  methods: {
    stopAnimation: function(state) {
      if (state.animationFrameRequestId) {
        cancelAnimationFrame(state.animationFrameRequestId);
      }
      return this;
    },
    ...linkedMethods
  },

  stateInit: () => ({
    lastSetZoom: 1,
    forceGraph: new CanvasForceGraph(),
    shadowGraph: new CanvasForceGraph()
      .cooldownTicks(0)
      .nodeColor('__indexColor')
      .linkColor('__indexColor'),
    objs: ['__reserved for background__'] // indexed objects for rgb lookup
  }),

  init: function(domNode, state) {
    // Wipe DOM
    domNode.innerHTML = '';

    state.canvas = document.createElement('canvas');
    if (state.backgroundColor) state.canvas.style.background = state.backgroundColor;
    domNode.appendChild(state.canvas);

    state.shadowCanvas = document.createElement('canvas');

    // Show shadow canvas
    //state.shadowCanvas.style.position = 'absolute';
    //state.shadowCanvas.style.top = '0';
    //state.shadowCanvas.style.left = '0';
    //domNode.appendChild(state.shadowCanvas);

    const ctx = state.canvas.getContext('2d');
    const shadowCtx = state.shadowCanvas.getContext('2d');

    // Setup zoom / pan interaction
    state.zoom = d3Zoom();
    state.zoom(state.zoom.__baseElem = d3Select(state.canvas)); // Attach controlling elem for easy access

    state.zoom
      .scaleExtent([0.01, 1000])
      .on('zoom', function() {
        const t = d3ZoomTransform(this); // Same as d3.event.transform
        [ctx, shadowCtx].forEach(c => {
          c.resetTransform();
          c.translate(t.x, t.y);
          c.scale(t.k, t.k);
        });
      });

    adjustCanvasSize(state);

    state.forceGraph.onFinishLoading(() => {
      // re-zoom, if still in default position (not user modified)
      if (d3ZoomTransform(state.canvas).k === state.lastSetZoom) {
        state.zoom.scaleTo(state.zoom.__baseElem,
          state.lastSetZoom = ZOOM2NODES_FACTOR / Math.cbrt(state.forceGraph.graphData().nodes.length)
        );
      }
    });

    // Setup tooltip
    const toolTipElem = document.createElement('div');
    toolTipElem.classList.add('graph-tooltip');
    domNode.appendChild(toolTipElem);

    // Capture mouse coords on move
    const mousePos = { x: -Infinity, y: -Infinity };
    state.canvas.addEventListener("mousemove", ev => {
      // update the mouse pos
      const offset = getOffset(domNode);
      mousePos.x = ev.pageX - offset.left;
      mousePos.y = ev.pageY - offset.top;

      // Move tooltip
      toolTipElem.style.top = `${mousePos.y}px`;
      toolTipElem.style.left = `${mousePos.x}px`;

      function getOffset(el) {
        const rect = el.getBoundingClientRect(),
          scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
          scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
      }
    }, false);

    // Handle click events on nodes
    domNode.addEventListener("click", ev => {
      if (state.hoverObj) {
        state[`on${getObjType(state.hoverObj)}Click`](state.hoverObj);
      }
    }, false);

    state.forceGraph(ctx);
    state.shadowGraph(shadowCtx);

    //

    // Kick-off renderer
    (function animate() { // IIFE
      if (state.enablePointerInteraction) {

        // Update tooltip and trigger onHover events
        const [r, g, b] = shadowCtx.getImageData(mousePos.x, mousePos.y, 1, 1).data;
        const objIndex = rgb2Int(r, g, b); // Convert from rgb to int (obj list index)

        const hoverObj = objIndex ? state.objs[objIndex] : null;

        if (hoverObj !== state.hoverObj) {
          const prevObj = state.hoverObj;
          const prevObjType = prevObj ? getObjType(prevObj) : null;
          const obj = hoverObj;
          const objType = obj ? getObjType(obj) : null;
          if (prevObjType && prevObjType !== objType) {
            // Hover out
            state[`on${prevObjType}Hover`](null, prevObj);
          }
          if (objType) {
            // Hover in
            state[`on${objType}Hover`](obj, prevObjType === objType ? prevObj : null);
          }

          const tooltipContent = hoverObj ? accessorFn(state[`${objType.toLowerCase()}Label`])(obj) || '' : '';
          toolTipElem.style.visibility = tooltipContent.length ? 'visible' : 'hidden';
          toolTipElem.innerHTML = tooltipContent;

          state.hoverObj = hoverObj;
        }
      }

      // Wipe canvas
      const t = d3ZoomTransform(state.canvas);
      [ctx, shadowCtx].forEach(c =>
        c.clearRect(-t.x / t.k, -t.y / t.k, state.width / t.k, state.height / t.k)
      );

      // Adjust link hover area
      state.shadowGraph.linkWidth(l => accessorFn(state.linkWidth)(l) + state.linkHoverPrecision);

      // Frame cycle
      [state.forceGraph, state.shadowGraph].forEach(graph => {
        graph.globalScale(t.k)
          .tickFrame();
      });

      state.animationFrameRequestId = requestAnimationFrame(animate);
    })();

    function getObjType(obj) {
      return obj.hasOwnProperty('source') && obj.hasOwnProperty('target') ? 'Link' : 'Node';
    }
  },

  update: function updateFn(state) {}
});
