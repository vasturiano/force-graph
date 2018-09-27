import { select as d3Select, event as d3Event } from 'd3-selection';
import { zoom as d3Zoom, zoomTransform as d3ZoomTransform } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import throttle from 'lodash.throttle';
import TweenLite from 'gsap';
import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import ColorTracker from 'canvas-color-tracker';

import CanvasForceGraph from './canvas-force-graph';
import linkKapsule from './kapsule-link.js';

const HOVER_CANVAS_THROTTLE_DELAY = 800; // ms to throttle shadow canvas updates for perf improvement
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
    'linkDirectionalArrowLength',
    'linkDirectionalArrowColor',
    'linkDirectionalArrowRelPos',
    'linkDirectionalParticles',
    'linkDirectionalParticleSpeed',
    'linkDirectionalParticleWidth',
    'linkDirectionalParticleColor',
    'd3AlphaDecay',
    'd3VelocityDecay',
    'warmupTicks',
    'cooldownTicks',
    'cooldownTime',
    'onEngineTick',
    'onEngineStop'
  ].map(p => ({ [p]: bindFG.linkProp(p)})),
  ...[
    'nodeRelSize',
    'nodeId',
    'nodeVal',
    'linkSource',
    'linkTarget',
    'linkCurvature'
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

    const pxScale = window.devicePixelRatio; // 2 on retina displays
    curWidth /= pxScale;
    curHeight /= pxScale;

    // Resize canvases
    [state.canvas, state.shadowCanvas].forEach(canvas => {
      // Element size
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;

      // Memory size (scaled to avoid blurriness)
      canvas.width = state.width * pxScale;
      canvas.height = state.height * pxScale;

      // Normalize coordinate system to use css pixels (on init only)
      if (!curWidth && !curHeight) {
        canvas.getContext('2d').scale(pxScale, pxScale);
      }
    });

    // Relative center panning based on 0,0
    const k = d3ZoomTransform(state.canvas).k;
    state.zoom.translateBy(state.zoom.__baseElem,
      (state.width - curWidth) / 2 / k,
      (state.height - curHeight) / 2 / k
    );
  }
}

function resetTransform(ctx) {
  const pxRatio = window.devicePixelRatio;
  ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
}

function clearCanvas(ctx, width, height) {
  ctx.save();
  resetTransform(ctx);  // reset transform
  ctx.clearRect(0, 0, width, height);
  ctx.restore();        //restore transforms
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

        [{ type: 'Node', objs: d.nodes }, { type: 'Link', objs: d.links }].forEach(hexIndex);
        state.forceGraph.graphData(d);
        state.shadowGraph.graphData(d);

        function hexIndex({ type, objs }) {
          objs
            .filter(d => !d.hasOwnProperty('__indexColor'))
            .forEach(d => {
              // store object lookup color
              d.__indexColor = state.colorTracker.register({ type, d });
            });
        }
      }),
      triggerUpdate: false
    },
    backgroundColor: { onChange(color, state) { state.canvas && color && (state.canvas.style.background = color) }, triggerUpdate: false },
    nodeLabel: { default: 'name', triggerUpdate: false },
    linkLabel: { default: 'name', triggerUpdate: false },
    linkHoverPrecision: { default: 4, triggerUpdate: false },
    enableNodeDrag: { default: true, triggerUpdate: false },
    enableZoomPanInteraction: { default: true, triggerUpdate: false },
    enablePointerInteraction: { default: true, onChange(_, state) { state.hoverObj = null; }, triggerUpdate: false },
    onNodeDrag: { default: () => {}, triggerUpdate: false },
    onNodeDragEnd: { default: () => {}, triggerUpdate: false },
    onNodeClick: { default: () => {}, triggerUpdate: false },
    onNodeHover: { default: () => {}, triggerUpdate: false },
    onLinkClick: { default: () => {}, triggerUpdate: false },
    onLinkHover: { default: () => {}, triggerUpdate: false },
    ...linkedProps
  },

  methods: {
    centerAt: function(state, x, y, transitionDuration) {
      if (!state.canvas) return null; // no canvas yet

      // setter
      if (x !== undefined || y !== undefined) {
        const finalPos = Object.assign({},
          x !== undefined ? { x } : {},
          y !== undefined ? { y } : {}
        );
        if (!transitionDuration) { // no animation
          setCenter(finalPos);
        } else {
          const coords = getCenter();
          TweenLite.to(
            coords,
            transitionDuration / 1000,
            Object.assign({ onUpdate: () => setCenter(coords) }, finalPos)
          );
        }
        return this;
      }

      // getter
      return getCenter();

      //

      function getCenter() {
        const t = d3ZoomTransform(state.canvas);
        return { x: (state.width / 2 - t.x) / t.k, y: (state.height / 2 - t.y) / t.k };
      }

      function setCenter({ x, y }) {
        state.zoom.translateTo(
          state.zoom.__baseElem,
          x === undefined ? getCenter().x : x,
          y === undefined ? getCenter().y : y
        );
      }
    },
    zoom: function(state, k, transitionDuration) {
      if (!state.canvas) return null; // no canvas yet

      // setter
      if (k !== undefined) {
        if (!transitionDuration) { // no animation
          setZoom(k);
        } else {
          const scale = { k: getZoom() };
          TweenLite.to(
            scale,
            transitionDuration / 1000,
            { k, onUpdate: () => setZoom(scale.k) }
          );
        }
        return this;
      }

      // getter
      return getZoom();

      //

      function getZoom() {
        return d3ZoomTransform(state.canvas).k;
      }

      function setZoom(k) {
        state.zoom.scaleTo(state.zoom.__baseElem, k);
      }
    },
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
      .linkColor('__indexColor')
      .isShadow(true),
    colorTracker: new ColorTracker() // indexed objects for rgb lookup
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

    // Setup node drag interaction
    d3Select(state.canvas).call(
      d3Drag()
        .subject(() => {
          if (!state.enableNodeDrag) { return null; }
          const obj = state.hoverObj;
          return (obj && obj.type === 'Node') ? obj.d : null; // Only drag nodes
        })
        .on('start', () => {
          const obj = d3Event.subject;
          obj.__initialDragPos = { x: obj.x, y: obj.y, fx: obj.fx, fy: obj.fy };

          // keep engine running at low intensity throughout drag
          if (!d3Event.active) {
            state.forceGraph.d3AlphaTarget(0.3); // keep engine running at low intensity throughout drag
            obj.fx = obj.x; obj.fy = obj.y; // Fix points
          }

          // drag cursor
          state.canvas.classList.add('grabbable');
        })
        .on('drag', () => {
          const obj = d3Event.subject;
          const initPos = obj.__initialDragPos;
          const dragPos = d3Event;

          const k = d3ZoomTransform(state.canvas).k;

          // Move fx/fy (and x/y) of nodes based on the scaled drag distance since the drag start
          ['x', 'y'].forEach(c => obj[`f${c}`] = obj[c] = initPos[c] + (dragPos[c] - initPos[c]) / k);

          // prevent freeze while dragging
          state.forceGraph.resetCountdown();

          state.onNodeDrag(obj);
        })
        .on('end', () => {
          const obj = d3Event.subject;
          const initPos = obj.__initialDragPos;

          if (initPos.fx === undefined) { obj.fx = undefined; }
          if (initPos.fy === undefined) { obj.fy = undefined; }
          delete(obj.__initialDragPos);

          state.forceGraph
            .d3AlphaTarget(0)   // release engine low intensity
            .resetCountdown();  // let the engine readjust after releasing fixed nodes

          // drag cursor
          state.canvas.classList.remove('grabbable');

          state.onNodeDragEnd(obj);
        })
    );

    // Setup zoom / pan interaction
    state.zoom = d3Zoom();
    state.zoom(state.zoom.__baseElem = d3Select(state.canvas)); // Attach controlling elem for easy access

    state.zoom
      .filter(() => state.enableZoomPanInteraction ? !d3Event.button : false) // disable zoom interaction
      .scaleExtent([0.01, 1000])
      .on('zoom', function() {
        const t = d3ZoomTransform(this); // Same as d3.event.transform
        [ctx, shadowCtx].forEach(c => {
          resetTransform(c);
          c.translate(t.x, t.y);
          c.scale(t.k, t.k);
        });
      });

    adjustCanvasSize(state);

    state.forceGraph.onFinishLoading(() => {
      // re-zoom, if still in default position (not user modified)
      if (d3ZoomTransform(state.canvas).k === state.lastSetZoom) {
        state.zoom.scaleTo(state.zoom.__baseElem,
          state.lastSetZoom = ZOOM2NODES_FACTOR / Math.cbrt(state.graphData.nodes.length)
        );
      }
    });

    // Setup tooltip
    const toolTipElem = document.createElement('div');
    toolTipElem.classList.add('graph-tooltip');
    domNode.appendChild(toolTipElem);

    // Capture mouse coords on move
    const mousePos = { x: -1e12, y: -1e12 };
    state.canvas.addEventListener("mousemove", ev => {
      // update the mouse pos
      const offset = getOffset(domNode);
      mousePos.x = ev.pageX - offset.left;
      mousePos.y = ev.pageY - offset.top;

      // Move tooltip
      toolTipElem.style.top = `${ev.pageY}px`;
      toolTipElem.style.left = `${ev.pageX}px`;

      //

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
        state[`on${state.hoverObj.type}Click`](state.hoverObj.d);
      }
    }, false);

    state.forceGraph(ctx);
    state.shadowGraph(shadowCtx);

    //

    const refreshShadowCanvas = throttle(() => {
      // wipe canvas
      clearCanvas(shadowCtx, state.width, state.height);

      // Adjust link hover area
      state.shadowGraph.linkWidth(l => accessorFn(state.linkWidth)(l) + state.linkHoverPrecision);

      // redraw
      const t = d3ZoomTransform(state.canvas);
      state.shadowGraph.globalScale(t.k).tickFrame();
    }, HOVER_CANVAS_THROTTLE_DELAY);

    // Kick-off renderer
    (function animate() { // IIFE
      if (state.enablePointerInteraction) {
        // Update tooltip and trigger onHover events

        // Lookup object per pixel color
        const pxScale = window.devicePixelRatio;
        const px = shadowCtx.getImageData(mousePos.x * pxScale, mousePos.y * pxScale, 1, 1);
        const obj = px ? state.colorTracker.lookup(px.data) : null;

        if (obj !== state.hoverObj) {
          const prevObj = state.hoverObj;
          const prevObjType = prevObj ? prevObj.type : null;
          const objType = obj ? obj.type : null;

          if (prevObjType && prevObjType !== objType) {
            // Hover out
            state[`on${prevObjType}Hover`](null, prevObj.d);
          }
          if (objType) {
            // Hover in
            state[`on${objType}Hover`](obj.d, prevObjType === objType ? prevObj.d : null);
          }

          const tooltipContent = obj ? accessorFn(state[`${obj.type.toLowerCase()}Label`])(obj.d) || '' : '';
          toolTipElem.style.visibility = tooltipContent ? 'visible' : 'hidden';
          toolTipElem.innerHTML = tooltipContent;

          state.hoverObj = obj;
        }

        refreshShadowCanvas();
      }

      // Wipe canvas
      clearCanvas(ctx, state.width, state.height);

      // Frame cycle
      const t = d3ZoomTransform(state.canvas);
      state.forceGraph.globalScale(t.k).tickFrame();

      state.animationFrameRequestId = requestAnimationFrame(animate);
    })();
  },

  update: function updateFn(state) {}
});
