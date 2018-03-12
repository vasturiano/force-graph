import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter
} from 'd3-force';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import indexBy from 'index-array-by';

import { autoColorObjects } from './color-utils';

//

export default Kapsule({

  props: {
    graphData: {
      default: {
        nodes: [],
        links: []
      },
      onChange(_, state) { state.engineRunning = false; } // Pause simulation
    },
    nodeRelSize: { default: 4, triggerUpdate: false }, // area per val unit
    nodeId: { default: 'id' },
    nodeVal: { default: 'val', triggerUpdate: false },
    nodeColor: { default: 'color', triggerUpdate: false },
    nodeAutoColorBy: {},
    nodeCanvasObject: {},
    linkSource: { default: 'source' },
    linkTarget: { default: 'target' },
    linkColor: { default: 'color', triggerUpdate: false },
    linkAutoColorBy: {},
    linkWidth: { default: 1, triggerUpdate: false },
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
    onFinishLoading: { default: () => {}, triggerUpdate: false }
  },

  methods: {
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
      paintPhotons();
      paintNodes();

      return this;

      //

      function layoutTick() {
        if (state.engineRunning) {
          if (++state.cntTicks > state.cooldownTicks || (new Date()) - state.startTickTime > state.cooldownTime) {
            state.engineRunning = false; // Stop ticking graph
          } else {
            state.forceLayout.tick(); // Tick it
          }
        }
      }

      function paintNodes() {
        const getVal = accessorFn(state.nodeVal);
        const getColor = accessorFn(state.nodeColor);
        const ctx = state.ctx;

        ctx.save();
        state.graphData.nodes.forEach(node => {
          if (state.nodeCanvasObject) {
            // Custom node paint
            state.nodeCanvasObject(node, state.ctx, state.globalScale);
            return;
          }

          const r = Math.sqrt(Math.max(0, getVal(node) || 1)) * state.nodeRelSize;

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = getColor(node) || 'rgb(31, 120, 180, 0.92)';
          ctx.fill();
        });
        ctx.restore();
      }

      function paintLinks() {
        const getColor = accessorFn(state.linkColor);
        const getWidth = accessorFn(state.linkWidth);
        const ctx = state.ctx;

        ctx.save();

        // Bundle strokes per unique color/width for performance optimization
        const linksPerColor = indexBy(state.graphData.links, [getColor, getWidth]);

        Object.entries(linksPerColor).forEach(([color, linksPerWidth]) => {
          const lineColor = !color || color === 'undefined' ? 'rgba(0,0,0,0.15)' : color;
          Object.entries(linksPerWidth).forEach(([width, links]) => {
            const lineWidth = (width || 1) / state.globalScale;

            ctx.beginPath();
            links.forEach(link => {
              const start = link.source;
              const end = link.target;
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
            });
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          });
        });

        ctx.restore();
      }

      function paintPhotons() {
        const getNumPhotons = accessorFn(state.linkDirectionalParticles);
        const getSpeed = accessorFn(state.linkDirectionalParticleSpeed);
        const getDiameter = accessorFn(state.linkDirectionalParticleWidth);
        const getColor = accessorFn(state.linkDirectionalParticleColor || state.linkColor);
        const ctx = state.ctx;

        ctx.save();
        state.graphData.links.forEach(link => {
          if (!getNumPhotons(link)) return;

          const start = link.source;
          const end = link.target;

          const particleSpeed = getSpeed(link);
          const photons = link.__photons || [];
          const photonR = Math.max(0, getDiameter(link) / 2) / Math.sqrt(state.globalScale);
          const photonColor = getColor(link) || 'rgba(0,0,0,0.28)';

          ctx.fillStyle = photonColor;

          photons.forEach((photon, idx) => {
            const photonPosRatio = photon.__progressRatio =
              ((photon.__progressRatio || (idx / photons.length)) + particleSpeed) % 1;

            const coords = ['x', 'y'].map(dim =>
              start[dim] + (end[dim] - start[dim]) * photonPosRatio || 0
            );

            ctx.beginPath();
            ctx.arc(coords[0], coords[1], photonR, 0, 2 * Math.PI, false);
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
      .nodes(state.graphData.nodes)
      .force('link')
        .id(d => d[state.nodeId])
        .links(state.graphData.links);

    for (let i=0; i<state.warmupTicks; i++) { state.forceLayout.tick(); } // Initial ticks before starting to render

    this.resetCountdown();
    state.onFinishLoading();
  }
});
