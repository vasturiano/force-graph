import { select as d3Select, event as d3Event } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import Kapsule from 'kapsule';

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
    'graphData',
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
    forceGraph: new CanvasForceGraph(),
    shadowGraph: new CanvasForceGraph().cooldownTicks(0),
    curTransform: { k: 1, x: 0, y: 0 }
  }),

  init: function(domNode, state) {
    // Wipe DOM
    domNode.innerHTML = '';

    state.canvas = document.createElement('canvas');
    if (state.backgroundColor) state.canvas.style.background = state.backgroundColor;
    domNode.appendChild(state.canvas);

    state.shadowCanvas = document.createElement('canvas');

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

    /*
    // Capture mouse coords on move
    const raycaster = new three.Raycaster();
    const mousePos = new three.Vector2();
    mousePos.x = -2; // Initialize off canvas
    mousePos.y = -2;
    state.canvas.addEventListener("mousemove", ev => {
      // update the mouse pos
      const offset = getOffset(domNode),
        relPos = {
          x: ev.pageX - offset.left,
          y: ev.pageY - offset.top
        };
      mousePos.x = (relPos.x / state.width) * 2 - 1;
      mousePos.y = -(relPos.y / state.height) * 2 + 1;

      // Move tooltip
      toolTipElem.style.top = (relPos.y - 40) + 'px';
      toolTipElem.style.left = (relPos.x - 20) + 'px';

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
        state[`on${state.hoverObj.__graphObjType === 'node' ? 'Node' : 'Link'}Click`](state.hoverObj.__data);
      }
    }, false);
    */

    state.forceGraph(ctx);
    state.shadowGraph(shadowCtx);

    //

    // Kick-off renderer
    (function animate() { // IIFE
      if (state.enablePointerInteraction) {
        /*
        // Update tooltip and trigger onHover events
        raycaster.linePrecision = state.linkHoverPrecision;

        raycaster.setFromCamera(mousePos, state.camera);
        const intersects = raycaster.intersectObjects(state.forceGraph.children)
          .filter(o => ['node', 'link'].indexOf(o.object.__graphObjType) !== -1) // Check only node/link objects
          .sort((a, b) => { // Prioritize nodes over links
            const isNode = o => o.object.__graphObjType === 'node';
            return isNode(b) - isNode(a);
          });

        const topObject = intersects.length ? intersects[0].object : null;

        if (topObject !== state.hoverObj) {
          const prevObjType = state.hoverObj ? state.hoverObj.__graphObjType : null;
          const prevObjData = state.hoverObj ? state.hoverObj.__data : null;
          const objType = topObject ? topObject.__graphObjType : null;
          const objData = topObject ? topObject.__data : null;
          if (prevObjType && prevObjType !== objType) {
            // Hover out
            state[`on${prevObjType === 'node' ? 'Node' : 'Link'}Hover`](null, prevObjData);
          }
          if (objType) {
            // Hover in
            state[`on${objType === 'node' ? 'Node' : 'Link'}Hover`](objData, prevObjType === objType ? prevObjData : null);
          }

          toolTipElem.innerHTML = topObject ? accessorFn(state[`${objType}Label`])(objData) || '' : '';

          state.hoverObj = topObject;
        }
        */
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
  },

  update: function updateFn(state) {

  }
});
