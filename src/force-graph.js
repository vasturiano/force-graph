import { select as d3Select, event as d3Event } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import CanvasForceGraph from './canvas-force-graph';
import linkKapsule from './kapsule-link.js';

// Expose config from forceGraph
const bindFG = linkKapsule('forceGraph', CanvasForceGraph);
const bindBoth = linkKapsule(['forceGraph', 'shadowGraph'], CanvasForceGraph);
const linkedProps = Object.assign(
  ...[
    'jsonUrl',
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
    const t = state.curTransform;
    t.x = state.width / 2 / t.k;
    t.y = state.height / 2 / t.k;

    [state.canvas, state.shadowCanvas].forEach(canvas => {
      canvas.width = state.width;
      canvas.height = state.height;

      const ctx = canvas.getContext('2d');
      ctx.resetTransform();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);
    });
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
        hexIndex([...d.nodes, ...d.links]);
        state.forceGraph.graphData(d);
        state.shadowGraph.graphData(d);

        function hexIndex(objs) {
          objs
            .filter(obj => !obj.hasOwnProperty('__indexColor'))
            .forEach(obj => {
              // index per color hex key
              obj.__indexColor = `#${state.objs.length.toString(16).padStart(6, '0')}`;
              state.objs.push(obj);
            });
        }
      }),
      triggerUpdate: false
    },
    backgroundColor: { onChange(color, state) { state.canvas && color && (state.canvas.style.background = color) }, triggerUpdate: false },
    nodeLabel: { default: 'name', triggerUpdate: false },
    linkLabel: { default: 'name', triggerUpdate: false },
    linkHoverPrecision: { default: 1, triggerUpdate: false },
    enablePointerInteraction: { default: true, onChange(_, state) { state.onHover = null; }, triggerUpdate: false },
    onNodeClick: { default: () => {}, triggerUpdate: false },
    onNodeHover: { default: () => {}, triggerUpdate: false },
    onLinkClick: { default: () => {}, triggerUpdate: false },
    onLinkHover: { default: () => {}, triggerUpdate: false },
    ...linkedProps
  },

  methods: {
    _adjustCanvasSize(state) {
      state.canvas.width = state.width;
      state.canvas.height = state.height;

      const ctx = state.canvas.getContext('2d');
      const t = state.curTransform;
      t.x = state.width/2 / t.k;
      t.y = state.height/2 / t.k;
      ctx.resetTransform();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);
    },
    ...linkedMethods
  },

  stateInit: () => ({
    curTransform: { k: 1, x: 0, y: 0 },
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

    adjustCanvasSize(state);
    const ctx = state.canvas.getContext('2d');
    const shadowCtx = state.shadowCanvas.getContext('2d');

    // Setup zoom / pan interaction
    d3Select(state.canvas).call(d3Zoom().scaleExtent([0.01, 1000]).on('zoom', () => {
      const transform = d3Event.transform;

      const t = state.curTransform = Object.assign({}, transform);
      // center on 0,0
      t.x += state.width / 2 * t.k;
      t.y += state.height / 2 * t.k;

      [ctx, shadowCtx].forEach(c => {
        c.resetTransform();
        c.translate(t.x, t.y);
        c.scale(t.k, t.k);
      });
    }));

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
      toolTipElem.style.top = (mousePos.y - 40) + 'px';
      toolTipElem.style.left = (mousePos.x - 20) + 'px';

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
        const objIndex = (r << 16) + (g << 8) + b; // Convert from rgb to int (obj list index)

        const hoverObj = objIndex ? state.objs[objIndex] : null;
        //console.log(hoverObject);

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

          toolTipElem.style.visibility = hoverObj ? 'visible' : 'hidden';
          toolTipElem.innerHTML = hoverObj ? accessorFn(state[`${objType.toLowerCase()}Label`])(obj) || '' : '';

          state.hoverObj = hoverObj;
        }
      }

      // Wipe canvas
      const t = state.curTransform;
      [ctx, shadowCtx].forEach(c =>
        c.clearRect(-t.x / t.k, -t.y / t.k, state.width / t.k, state.height / t.k)
      );

      // Frame cycle
      [state.forceGraph, state.shadowGraph].forEach(graph => {
        graph.globalScale(t.k)
          .tickFrame();
      });
      requestAnimationFrame(animate);
    })();

    function getObjType(obj) {
      return obj.hasOwnProperty('source') && obj.hasOwnProperty('target') ? 'Link' : 'Node';
    }
  },

  update: function updateFn(state) {

  }
});
