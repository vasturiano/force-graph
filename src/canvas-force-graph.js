import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter,
  forceRadial as d3ForceRadial
} from 'd3-force-3d';

import { default as Bezier } from 'bezier-js';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import indexBy from 'index-array-by';

import { autoColorObjects } from './color-utils';
import getDagDepths from './dagDepths';

//

const DAG_LEVEL_NODE_RATIO = 2;

export default Kapsule({

  props: {
    graphData: {
      default: {
        nodes: [],
        links: []
      },
      onChange(_, state) {
        state.engineRunning = false;
      } // Pause simulation
    },
    dagMode: { onChange(dagMode, state) { // td, bu, lr, rl, radialin, radialout
      !dagMode && (state.graphData.nodes || []).forEach(n => n.fx = n.fy = undefined); // unfix nodes when disabling dag mode
    }},
    dagLevelDistance: {},
    nodeRelSize: { default: 4, triggerUpdate: false }, // area per val unit
    nodeId: { default: 'id' },
    nodeVal: { default: 'val', triggerUpdate: false },
    nodeColor: { default: 'color', triggerUpdate: false },
    nodeAutoColorBy: {},
    nodeCanvasObject: { triggerUpdate: false },
    linkSource: { default: 'source' },
    linkTarget: { default: 'target' },
    linkVisibility: { default: true, triggerUpdate: false },
    linkColor: { default: 'color', triggerUpdate: false },
    linkAutoColorBy: {},
    linkWidth: { default: 1, triggerUpdate: false },
    linkCurvature: { default: 0, triggerUpdate: false },
    linkCanvasObject: { triggerUpdate: false },
    linkDirectionalArrowLength: { default: 0, triggerUpdate: false },
    linkDirectionalArrowColor: { triggerUpdate: false },
    linkDirectionalArrowRelPos: { default: 0.5, triggerUpdate: false }, // value between 0<>1 indicating the relative pos along the (exposed) line
    linkDirectionalParticles: { default: 0 }, // animate photons travelling in the link direction
    linkDirectionalParticleSpeed: { default: 0.01, triggerUpdate: false }, // in link length ratio per frame
    linkDirectionalParticleWidth: { default: 4, triggerUpdate: false },
    linkDirectionalParticleColor: { triggerUpdate: false },
    globalScale: { default: 1, triggerUpdate: false },
    d3AlphaDecay: { default: 0.0228, triggerUpdate: false, onChange(alphaDecay, state) { state.forceLayout.alphaDecay(alphaDecay) }},
    d3AlphaTarget: { default: 0, triggerUpdate: false, onChange(alphaTarget, state) { state.forceLayout.alphaTarget(alphaTarget) }},
    d3VelocityDecay: { default: 0.4, triggerUpdate: false, onChange(velocityDecay, state) { state.forceLayout.velocityDecay(velocityDecay) } },
    warmupTicks: { default: 0, triggerUpdate: false }, // how many times to tick the force engine at init before starting to render
    cooldownTicks: { default: Infinity, triggerUpdate: false },
    cooldownTime: { default: 15000, triggerUpdate: false }, // ms
    onLoading: { default: () => {}, triggerUpdate: false },
    onFinishLoading: { default: () => {}, triggerUpdate: false },
    onEngineTick: { default: () => {}, triggerUpdate: false },
    onEngineStop: { default: () => {}, triggerUpdate: false },
    isShadow: { default: false, triggerUpdate: false }
  },

  methods: {
    refresh: function(state) {
      state._rerender();
      return this;
    },
    // Expose d3 forces for external manipulation
    d3Force: function(state, forceName, forceFn) {
      if (forceFn === undefined) {
        return state.forceLayout.force(forceName); // Force getter
      }
      state.forceLayout.force(forceName, forceFn); // Force setter
      return this;
    },
    // reset cooldown state
    resetCountdown: function(state) {
      state.cntTicks = 0;
      state.startTickTime = new Date();
      state.engineRunning = true;
      return this;
    },
    tickFrame: function(state) {
      layoutTick();
      paintLinks();
      paintArrows();
      paintPhotons();
      paintNodes();

      return this;

      //

      function layoutTick() {
        if (state.engineRunning) {
          if (++state.cntTicks > state.cooldownTicks || (new Date()) - state.startTickTime > state.cooldownTime) {
            state.engineRunning = false; // Stop ticking graph
            state.onEngineStop();
          } else {
            state.forceLayout.tick(); // Tick it
            state.onEngineTick();
          }
        }
      }

      function paintNodes() {
        const getVal = accessorFn(state.nodeVal);
        const getColor = accessorFn(state.nodeColor);
        const ctx = state.ctx;

        // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
        const padAmount = state.isShadow / state.globalScale;

        ctx.save();
        state.graphData.nodes.forEach(node => {
          if (state.nodeCanvasObject) {
            // Custom node paint
            state.nodeCanvasObject(node, state.ctx, state.globalScale);
            return;
          }

          // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
          const r = Math.sqrt(Math.max(0, getVal(node) || 1)) * state.nodeRelSize + padAmount;

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = getColor(node) || 'rgba(31, 120, 180, 0.92)';
          ctx.fill();
        });
        ctx.restore();
      }

      function paintLinks() {
        const getVisibility = accessorFn(state.linkVisibility);
        const getColor = accessorFn(state.linkColor);
        const getWidth = accessorFn(state.linkWidth);
        const getCurvature = accessorFn(state.linkCurvature);
        const ctx = state.ctx;

        // Draw wider lines by 2px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
        const padAmount = state.isShadow * 2;

        ctx.save();

        const visibleLinks = state.graphData.links.filter(getVisibility);

        if (state.linkCanvasObject) {
          // Custom link paints
          visibleLinks.forEach(link => state.linkCanvasObject(link, state.ctx, state.globalScale));
          return;
        }

        // Bundle strokes per unique color/width for performance optimization
        const linksPerColor = indexBy(visibleLinks, [getColor, getWidth]);

        Object.entries(linksPerColor).forEach(([color, linksPerWidth]) => {
          const lineColor = !color || color === 'undefined' ? 'rgba(0,0,0,0.15)' : color;
          Object.entries(linksPerWidth).forEach(([width, links]) => {
            const lineWidth = (width || 1) / state.globalScale + padAmount;

            ctx.beginPath();
            links.forEach(link => {
              const start = link.source;
              const end = link.target;
              if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

              const curvature = getCurvature(link);

              ctx.moveTo(start.x, start.y);

              if (!curvature) { // Straight line
                ctx.lineTo(end.x, end.y);
                link.__controlPoints = null;
                return;
              }

              const l = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)); // line length

              if (l > 0) {
                const a = Math.atan2(end.y - start.y, end.x - start.x); // line angle
                const d = l * curvature; // control point distance

                const cp = { // control point
                  x: (start.x + end.x) / 2 + d * Math.cos(a - Math.PI / 2),
                  y: (start.y + end.y) / 2 + d * Math.sin(a - Math.PI / 2)
                };
                ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);

                link.__controlPoints = [cp.x, cp.y];
              } else { // Same point, draw a loop
                const d = curvature * 70;
                const cps = [end.x, end.y - d, end.x + d, end.y];
                ctx.bezierCurveTo(...cps, end.x, end.y);

                link.__controlPoints = cps;
              }
            });
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          });
        });

        ctx.restore();
      }

      function paintArrows() {
        const ARROW_WH_RATIO = 1.6;
        const ARROW_VLEN_RATIO = 0.2;

        const getLength = accessorFn(state.linkDirectionalArrowLength);
        const getRelPos = accessorFn(state.linkDirectionalArrowRelPos);
        const getVisibility = accessorFn(state.linkVisibility);
        const getColor = accessorFn(state.linkDirectionalArrowColor || state.linkColor);
        const getNodeVal = accessorFn(state.nodeVal);
        const ctx = state.ctx;

        ctx.save();
        state.graphData.links.filter(getVisibility).forEach(link => {
          const arrowLength = getLength(link);
          if (!arrowLength || arrowLength < 0) return;

          const start = link.source;
          const end = link.target;

          if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

          const startR = Math.sqrt(Math.max(0, getNodeVal(start) || 1)) * state.nodeRelSize;
          const endR = Math.sqrt(Math.max(0, getNodeVal(end) || 1)) * state.nodeRelSize;

          const arrowRelPos = Math.min(1, Math.max(0, getRelPos(link)));
          const arrowColor = getColor(link) || 'rgba(0,0,0,0.28)';
          const arrowHalfWidth = arrowLength / ARROW_WH_RATIO / 2;

          // Construct bezier for curved lines
          const bzLine = link.__controlPoints && new Bezier(start.x, start.y, ...link.__controlPoints, end.x, end.y);

          const getCoordsAlongLine = bzLine
              ? t => bzLine.get(t) // get position along bezier line
              : t => ({            // straight line: interpolate linearly
                x: start.x + (end.x - start.x) * t || 0,
                y: start.y + (end.y - start.y) * t || 0
              });

          const lineLen = bzLine
            ? bzLine.length()
            : Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

          const posAlongLine = startR + arrowLength + (lineLen - startR - endR - arrowLength) * arrowRelPos;

          const arrowHead = getCoordsAlongLine(posAlongLine / lineLen);
          const arrowTail = getCoordsAlongLine((posAlongLine - arrowLength) / lineLen);
          const arrowTailVertex = getCoordsAlongLine((posAlongLine - arrowLength * (1 - ARROW_VLEN_RATIO)) / lineLen);

          const arrowTailAngle = Math.atan2(arrowHead.y - arrowTail.y, arrowHead.x - arrowTail.x) - Math.PI / 2;

          ctx.beginPath();

          ctx.moveTo(arrowHead.x, arrowHead.y);
          ctx.lineTo(arrowTail.x + arrowHalfWidth * Math.cos(arrowTailAngle), arrowTail.y + arrowHalfWidth * Math.sin(arrowTailAngle));
          ctx.lineTo(arrowTailVertex.x, arrowTailVertex.y);
          ctx.lineTo(arrowTail.x - arrowHalfWidth * Math.cos(arrowTailAngle), arrowTail.y - arrowHalfWidth * Math.sin(arrowTailAngle));

          ctx.fillStyle = arrowColor;
          ctx.fill();
        });
        ctx.restore();
      }

      function paintPhotons() {
        const getNumPhotons = accessorFn(state.linkDirectionalParticles);
        const getSpeed = accessorFn(state.linkDirectionalParticleSpeed);
        const getDiameter = accessorFn(state.linkDirectionalParticleWidth);
        const getVisibility = accessorFn(state.linkVisibility);
        const getColor = accessorFn(state.linkDirectionalParticleColor || state.linkColor);
        const ctx = state.ctx;

        ctx.save();
        state.graphData.links.filter(getVisibility).forEach(link => {
          if (!getNumPhotons(link)) return;

          const start = link.source;
          const end = link.target;

          if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

          const particleSpeed = getSpeed(link);
          const photons = link.__photons || [];
          const photonR = Math.max(0, getDiameter(link) / 2) / Math.sqrt(state.globalScale);
          const photonColor = getColor(link) || 'rgba(0,0,0,0.28)';

          ctx.fillStyle = photonColor;

          // Construct bezier for curved lines
          const bzLine = link.__controlPoints
            ? new Bezier(start.x, start.y, ...link.__controlPoints, end.x, end.y)
            : null;

          photons.forEach((photon, idx) => {
            const photonPosRatio = photon.__progressRatio =
              ((photon.__progressRatio || (idx / photons.length)) + particleSpeed) % 1;

            const coords = bzLine
              ? bzLine.get(photonPosRatio)  // get position along bezier line
              : { // straight line: interpolate linearly
                x: start.x + (end.x - start.x) * photonPosRatio || 0,
                y: start.y + (end.y - start.y) * photonPosRatio || 0
              };

            ctx.beginPath();
            ctx.arc(coords.x, coords.y, photonR, 0, 2 * Math.PI, false);
            ctx.fill();
          });
        });
        ctx.restore();
      }
    }
  },

  stateInit: () => ({
    forceLayout: d3ForceSimulation()
      .force('link', d3ForceLink())
      .force('charge', d3ForceManyBody())
      .force('center', d3ForceCenter())
      .force('dagRadial', null)
      .stop(),
    engineRunning: false
  }),

  init(canvasCtx, state) {
    // Main canvas object to manipulate
    state.ctx = canvasCtx;
  },

  update(state) {
    state.engineRunning = false; // Pause simulation
    state.onLoading();

    if (state.nodeAutoColorBy !== null) {
      // Auto add color to uncolored nodes
      autoColorObjects(state.graphData.nodes, accessorFn(state.nodeAutoColorBy), state.nodeColor);
    }
    if (state.linkAutoColorBy !== null) {
      // Auto add color to uncolored links
      autoColorObjects(state.graphData.links, accessorFn(state.linkAutoColorBy), state.linkColor);
    }

    // parse links
    state.graphData.links.forEach(link => {
      link.source = link[state.linkSource];
      link.target = link[state.linkTarget];
    });

    // Add photon particles
    const linkParticlesAccessor = accessorFn(state.linkDirectionalParticles);
    state.graphData.links.forEach(link => {
      const numPhotons = Math.round(Math.abs(linkParticlesAccessor(link)));
      if (numPhotons) {
        link.__photons = [...Array(numPhotons)].map(() => ({}));
      }
    });

    // Feed data to force-directed layout
    state.forceLayout
      .stop()
      .alpha(1) // re-heat the simulation
      .nodes(state.graphData.nodes);

    // add links (if link force is still active)
    const linkForce = state.forceLayout.force('link');
    if (linkForce) {
      linkForce
        .id(d => d[state.nodeId])
        .links(state.graphData.links);
    }

    // setup dag force constraints
    const nodeDepths = state.dagMode && getDagDepths(state.graphData, node => node[state.nodeId]);
    const maxDepth = Math.max(...Object.values(nodeDepths || []));
    const dagLevelDistance = state.dagLevelDistance || (
        state.graphData.nodes.length / (maxDepth || 1) * DAG_LEVEL_NODE_RATIO
        * (['radialin', 'radialout'].indexOf(state.dagMode) !== -1 ? 0.7 : 1)
      );

    // Fix nodes to x,y for dag mode
    if (state.dagMode) {
      const getFFn = (fix, invert) => node => !fix
        ? undefined
        : (nodeDepths[node[state.nodeId]] - maxDepth / 2) * dagLevelDistance * (invert ? -1 : 1);

      const fxFn = getFFn(['lr', 'rl'].indexOf(state.dagMode) !== -1, state.dagMode === 'rl');
      const fyFn = getFFn(['td', 'bu'].indexOf(state.dagMode) !== -1, state.dagMode === 'bu');

      state.graphData.nodes.forEach(node => {
        node.fx = fxFn(node);
        node.fy = fyFn(node);
      });
    }

    // Use radial force for radial dags
    state.forceLayout.force('dagRadial',
      ['radialin', 'radialout'].indexOf(state.dagMode) !== -1
        ? d3ForceRadial(node => {
        const nodeDepth = nodeDepths[node[state.nodeId]];
        return (state.dagMode === 'radialin' ? maxDepth - nodeDepth : nodeDepth) * dagLevelDistance;
      })
        .strength(1)
        : null
    );

    for (let i=0; i<state.warmupTicks; i++) { state.forceLayout.tick(); } // Initial ticks before starting to render

    this.resetCountdown();
    state.onFinishLoading();
  }
});
