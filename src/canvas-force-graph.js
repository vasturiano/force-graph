import {
  forceSimulation as d3ForceSimulation,
  forceLink as d3ForceLink,
  forceManyBody as d3ForceManyBody,
  forceCenter as d3ForceCenter
} from 'd3-force';

import Kapsule from 'kapsule';
import qwest from 'qwest';
import accessorFn from 'accessor-fn';

import { autoColorObjects, colorStr2Hex } from './color-utils';

//

export default Kapsule({

  props: {
    jsonUrl: {},
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
    d3AlphaDecay: { default: 0.0228 },
    d3VelocityDecay: { default: 0.4 },
    warmupTicks: { default: 0 }, // how many times to tick the force engine at init before starting to render
    cooldownTicks: { default: Infinity },
    cooldownTime: { default: 15000 }, // ms
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
          ctx.fillStyle = getColor(node) || '#ffffaa';
          ctx.fill();
        });
        ctx.restore();
      }

      function paintLinks() {
        const getColor = accessorFn(state.linkColor);
        const getWidth = accessorFn(state.linkWidth);
        const ctx = state.ctx;

        ctx.save();
        state.graphData.links.forEach(link => {
          const start = link.source;
          const end = link.target;

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineWidth = (getWidth(link) || 1) / state.globalScale;
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = getColor(link) || '#f0f0f0';
          ctx.stroke();
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
          const photonColor =getColor(link) || '#f0f0f0';

          photons.forEach((photon, idx) => {
            const photonPosRatio = photon.__progressRatio =
              ((photon.__progressRatio || (idx / photons.length)) + particleSpeed) % 1;

            const coords = ['x', 'y'].map(dim =>
              start[dim] + (end[dim] - start[dim]) * photonPosRatio || 0
            );

            ctx.beginPath();
            ctx.arc(coords[0], coords[1], photonR, 0, 2 * Math.PI, false);
            ctx.fillStyle = photonColor;
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

    if (state.graphData.nodes.length || state.graphData.links.length) {
      console.info('force-graph loading', state.graphData.nodes.length + ' nodes', state.graphData.links.length + ' links');
    }

    if (!state.fetchingJson && state.jsonUrl && !state.graphData.nodes.length && !state.graphData.links.length) {
      // (Re-)load data
      state.fetchingJson = true;
      qwest.get(state.jsonUrl).then((_, json) => {
        state.fetchingJson = false;
        state.graphData = json;
        state._rerender();  // Force re-update
      });
    }

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
      .alpha(1)// re-heat the simulation
      .alphaDecay(state.d3AlphaDecay)
      .velocityDecay(state.d3VelocityDecay)
      .nodes(state.graphData.nodes)
      .force('link')
        .id(d => d[state.nodeId])
        .links(state.graphData.links);

    for (let i=0; i<state.warmupTicks; i++) { state.forceLayout.tick(); } // Initial ticks before starting to render

    state.cntTicks = 0;
    state.startTickTime = new Date();
    state.engineRunning = true;
    state.onFinishLoading();
  }
});
