import { select as d3Select } from 'd3-selection';
import { zoom as d3Zoom, zoomTransform as d3ZoomTransform } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import { max as d3Max, min as d3Min } from 'd3-array';
import throttle from 'lodash.throttle';
import TWEEN from '@tweenjs/tween.js';
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
    'nodeCanvasObjectMode',
    'linkColor',
    'linkAutoColorBy',
    'linkLineDash',
    'linkWidth',
    'linkCanvasObject',
    'linkCanvasObjectMode',
    'linkDirectionalArrowLength',
    'linkDirectionalArrowColor',
    'linkDirectionalArrowRelPos',
    'linkDirectionalParticles',
    'linkDirectionalParticleSpeed',
    'linkDirectionalParticleWidth',
    'linkDirectionalParticleColor',
    'dagMode',
    'dagLevelDistance',
    'dagNodeFilter',
    'onDagError',
    'd3AlphaMin',
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
    'nodeVisibility',
    'linkSource',
    'linkTarget',
    'linkVisibility',
    'linkCurvature'
  ].map(p => ({ [p]: bindBoth.linkProp(p)}))
);
const linkedMethods = Object.assign(...[
  'd3Force',
  'd3ReheatSimulation',
  'emitParticle'
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
            .filter(d => {
              if (!d.hasOwnProperty('__indexColor')) return true;
              const cur = state.colorTracker.lookup(d.__indexColor);
              return (!cur || !cur.hasOwnProperty('d') || cur.d !== d);
            })
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
    onNodeRightClick: { triggerUpdate: false },
    onNodeHover: { default: () => {}, triggerUpdate: false },
    onLinkClick: { default: () => {}, triggerUpdate: false },
    onLinkRightClick: { triggerUpdate: false },
    onLinkHover: { default: () => {}, triggerUpdate: false },
    onBackgroundClick: { default: () => {}, triggerUpdate: false },
    onBackgroundRightClick: { triggerUpdate: false },
    onZoom: { default: () => {}, triggerUpdate: false },
    onZoomEnd: { default: () => {}, triggerUpdate: false },
    onRenderFramePre: { triggerUpdate: false },
    onRenderFramePost: { triggerUpdate: false },
    ...linkedProps
  },

  aliases: { // Prop names supported for backwards compatibility
    stopAnimation: 'pauseAnimation'
  },

  methods: {
    graph2ScreenCoords: function(state, x, y) {
      const t = d3ZoomTransform(state.canvas);
      return { x: x * t.k  + t.x, y: y * t.k + t.y };
    },
    screen2GraphCoords: function(state, x, y) {
      const t = d3ZoomTransform(state.canvas);
      return { x: (x - t.x) / t.k, y: (y - t.y) / t.k };
    },
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
          new TWEEN.Tween(getCenter())
            .to(finalPos, transitionDuration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(setCenter)
            .start();
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
          new TWEEN.Tween({ k: getZoom() })
            .to({ k }, transitionDuration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(({ k }) => setZoom(k))
            .start();
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
    zoomToFit: function(state, transitionDuration = 0, padding = 10, ...bboxArgs) {
      const bbox = this.getGraphBbox(...bboxArgs);
      
      if (bbox) {
        const center = {
          x: (bbox.x[0] + bbox.x[1]) / 2,
          y: (bbox.y[0] + bbox.y[1]) / 2,
        };

        const zoomK = Math.max(1e-12, Math.min(1e12,
          (state.width - padding * 2) / (bbox.x[1] - bbox.x[0]),
          (state.height - padding * 2) / (bbox.y[1] - bbox.y[0]))
        );

        this.centerAt(center.x, center.y, transitionDuration);
        this.zoom(zoomK, transitionDuration);
      }

      return this;
    },
    getGraphBbox: function(state, nodeFilter = () => true) {
      const getVal = accessorFn(state.nodeVal);
      const getR = node => Math.sqrt(Math.max(0, getVal(node) || 1)) * state.nodeRelSize;

      const nodesPos = state.graphData.nodes.filter(nodeFilter).map(node => ({
        x: node.x,
        y: node.y,
        r: getR(node)
      }));

      return !nodesPos.length ? null : {
        x: [
          d3Min(nodesPos, node => node.x - node.r),
          d3Max(nodesPos, node => node.x + node.r)
        ],
        y: [
          d3Min(nodesPos, node => node.y - node.r),
          d3Max(nodesPos, node => node.y + node.r)
        ]
      };
    },
    pauseAnimation: function(state) {
      if (state.animationFrameRequestId) {
        cancelAnimationFrame(state.animationFrameRequestId);
        state.animationFrameRequestId = null;
      }
      return this;
    },
    resumeAnimation: function(state) {
      if (!state.animationFrameRequestId) {
        this._animationCycle();
      }
      return this;
    },
    _destructor: function() {
      this.pauseAnimation();
      this.graphData({ nodes: [], links: []});
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

    // Container anchor for canvas and tooltip
    const container = document.createElement('div');
    container.classList.add('force-graph-container');
    container.style.position = 'relative';
    domNode.appendChild(container);

    state.canvas = document.createElement('canvas');
    if (state.backgroundColor) state.canvas.style.background = state.backgroundColor;
    container.appendChild(state.canvas);

    state.shadowCanvas = document.createElement('canvas');

    // Show shadow canvas
    //state.shadowCanvas.style.position = 'absolute';
    //state.shadowCanvas.style.top = '0';
    //state.shadowCanvas.style.left = '0';
    //container.appendChild(state.shadowCanvas);

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
        .on('start', ev => {
          const obj = ev.subject;
          obj.__initialDragPos = { x: obj.x, y: obj.y, fx: obj.fx, fy: obj.fy };

          // keep engine running at low intensity throughout drag
          if (!ev.active) {
            obj.fx = obj.x; obj.fy = obj.y; // Fix points
          }

          // drag cursor
          state.canvas.classList.add('grabbable');
        })
        .on('drag', ev => {
          const obj = ev.subject;
          const initPos = obj.__initialDragPos;
          const dragPos = ev;

          const k = d3ZoomTransform(state.canvas).k;
          const translate = {
            x: (initPos.x + (dragPos.x - initPos.x) / k) - obj.x,
            y: (initPos.y + (dragPos.y - initPos.y) / k) - obj.y
          };

          // Move fx/fy (and x/y) of nodes based on the scaled drag distance since the drag start
          ['x', 'y'].forEach(c => obj[`f${c}`] = obj[c] = initPos[c] + (dragPos[c] - initPos[c]) / k);

          // prevent freeze while dragging
          state.forceGraph
            .d3AlphaTarget(0.3) // keep engine running at low intensity throughout drag
            .resetCountdown();  // prevent freeze while dragging

          obj.__dragged = true;
          state.onNodeDrag(obj, translate);
        })
        .on('end', ev => {
          const obj = ev.subject;
          const initPos = obj.__initialDragPos;
          const translate = {x: obj.x - initPos.x, y:  obj.y - initPos.y};

          if (initPos.fx === undefined) { obj.fx = undefined; }
          if (initPos.fy === undefined) { obj.fy = undefined; }
          delete(obj.__initialDragPos);

          state.forceGraph
            .d3AlphaTarget(0)   // release engine low intensity
            .resetCountdown();  // let the engine readjust after releasing fixed nodes

          // drag cursor
          state.canvas.classList.remove('grabbable');

          if (obj.__dragged) {
            delete(obj.__dragged);
            state.onNodeDragEnd(obj, translate);
          }
        })
    );

    // Setup zoom / pan interaction
    state.zoom = d3Zoom();
    state.zoom(state.zoom.__baseElem = d3Select(state.canvas)); // Attach controlling elem for easy access

    state.zoom.__baseElem.on('dblclick.zoom', null); // Disable double-click to zoom

    state.zoom
      .filter(ev => state.enableZoomPanInteraction ? !ev.button : false) // disable zoom interaction
      .scaleExtent([0.01, 1000])
      .on('zoom', function() {
        const t = d3ZoomTransform(this); // Same as d3.event.transform
        [ctx, shadowCtx].forEach(c => {
          resetTransform(c);
          c.translate(t.x, t.y);
          c.scale(t.k, t.k);
        });
        state.onZoom({ ...t });
      })
      .on('end', function() {
        const t = d3ZoomTransform(this); // Same as d3.event.transform
        state.onZoomEnd({ ...t });
      });

    adjustCanvasSize(state);

    state.forceGraph.onFinishUpdate(() => {
      // re-zoom, if still in default position (not user modified)
      if (d3ZoomTransform(state.canvas).k === state.lastSetZoom && state.graphData.nodes.length) {
        state.zoom.scaleTo(state.zoom.__baseElem,
          state.lastSetZoom = ZOOM2NODES_FACTOR / Math.cbrt(state.graphData.nodes.length)
        );
      }
    });

    // Setup tooltip
    const toolTipElem = document.createElement('div');
    toolTipElem.classList.add('graph-tooltip');
    container.appendChild(toolTipElem);

    // Capture pointer coords on move or touchstart
    const pointerPos = { x: -1e12, y: -1e12 };
    ['pointermove', 'pointerdown'].forEach(evType =>
      container.addEventListener(evType, ev => {
        // detect point drag
        !state.isPointerDragging && ev.type === 'pointermove'
        && ev.pressure > 0 && [ev.movementX, ev.movementY].some(m => Math.abs(m) > (ev.pointerType === 'touch' ? 1 : 0)) // relax drag trigger sensitivity on touch events
        && (state.isPointerDragging = true);

        // update the pointer pos
        const offset = getOffset(container);
        pointerPos.x = ev.pageX - offset.left;
        pointerPos.y = ev.pageY - offset.top;

        // Move tooltip
        toolTipElem.style.top = `${pointerPos.y}px`;
        toolTipElem.style.left = `${pointerPos.x}px`;

        //

        function getOffset(el) {
          const rect = el.getBoundingClientRect(),
            scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
        }
      }, { passive: true })
    );

    // Handle click/touch events on nodes/links
    container.addEventListener('pointerup', ev => {
      if (state.isPointerDragging) {
        state.isPointerDragging = false;
        return; // don't trigger click events after pointer drag (pan / node drag functionality)
      }

      requestAnimationFrame(() => { // trigger click events asynchronously, to allow hoverObj to be set (on frame)
        if (ev.button === 0) { // mouse left-click or touch
          if (state.hoverObj) {
            state[`on${state.hoverObj.type}Click`](state.hoverObj.d, ev);
          } else {
            state.onBackgroundClick(ev);
          }
        }

        if (ev.button === 2) { // mouse right-click
          if (state.hoverObj) {
            const fn = state[`on${state.hoverObj.type}RightClick`];
            fn && fn(state.hoverObj.d, ev);
          } else {
            state.onBackgroundRightClick && state.onBackgroundRightClick(ev);
          }
        }
      });
    }, { passive: true });

    container.addEventListener('contextmenu', ev => {
      if (!state.onBackgroundRightClick && !state.onNodeRightClick && !state.onLinkRightClick) return true; // default contextmenu behavior
      ev.preventDefault();
      return false;
    });

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
    (this._animationCycle = function animate() { // IIFE
      if (state.enablePointerInteraction) {
        // Update tooltip and trigger onHover events

        let obj = null;
        if (!state.isPointerDragging) { // don't hover during drag
          // Lookup object per pixel color
          const pxScale = window.devicePixelRatio;
          const px = (pointerPos.x > 0 && pointerPos.y > 0)
            ? shadowCtx.getImageData(pointerPos.x * pxScale, pointerPos.y * pxScale, 1, 1)
            : null;
          px && (obj = state.colorTracker.lookup(px.data));
        }

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
      const globalScale = d3ZoomTransform(state.canvas).k;
      state.onRenderFramePre && state.onRenderFramePre(ctx, globalScale);
      state.forceGraph.globalScale(globalScale).tickFrame();
      state.onRenderFramePost && state.onRenderFramePost(ctx, globalScale);

      TWEEN.update(); // update canvas animation tweens

      state.animationFrameRequestId = requestAnimationFrame(animate);
    })();
  },

  update: function updateFn(state) {}
});
