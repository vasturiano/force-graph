type arg0 = { nodes : any[], links : any[] };
type arg1 = Function;
type arg2 = {
  nodeFilter ?: Function // DO NOT USE "FUNCTION" TYPE. IT SHOULD BE PROPERLY DEFINED. PLEASE CORRECT THIS
  onLoopError ?: Function
};

export function getDagDepths({ nodes, links } : arg0, idAccessor : arg1, {
  nodeFilter = () => true,
  onLoopError = loopIds => { throw new Error(`Invalid DAG structure! Found cycle in node path: ${loopIds.join(' -> ')}.`) }
} : arg2 = {}) {
  // linked graph
  const graph = {};

  nodes.forEach(node => graph[idAccessor(node)] = { data: node, out : [], depth: -1, skip: !nodeFilter(node) });
  links.forEach(({ source, target }) => {
    const sourceId = getNodeId(source);
    const targetId = getNodeId(target);
    if (!graph.hasOwnProperty(sourceId)) throw new Error(`Missing source node with id: ${sourceId}`);
    if (!graph.hasOwnProperty(targetId)) throw new Error(`Missing target node with id: ${targetId}`);
    const sourceNode = graph[sourceId];
    const targetNode = graph[targetId];

    sourceNode.out.push(targetNode);

    function getNodeId(node) {
      return typeof node === 'object' ? idAccessor(node) : node;
    }
  });

  const foundLoops : any[] = [];
  traverse(Object.values(graph));

  const nodeDepths = Object.assign({}, ...Object.entries(graph)
    .filter(([, node]) => !node.skip)
    .map(([id, node]) => ({ [id]: node.depth }))
  );

  return nodeDepths;

  function traverse(nodes, nodeStack : unknown[] = [], currentDepth = 0) {
    for (let i=0, l=nodes.length; i<l; i++) {
      const node = nodes[i];
      if (nodeStack.indexOf(node) !== -1) {
        const loop = [...nodeStack.slice(nodeStack.indexOf(node)), node].map(d => idAccessor(d.data));
        if (!foundLoops.some(foundLoop => foundLoop.length === loop.length && foundLoop.every((id, idx) => id === loop[idx]))) {
          foundLoops.push(loop);
          onLoopError(loop);
        }
        continue;
      }
      if (currentDepth > node.depth) { // Don't unnecessarily revisit chunks of the graph
        node.depth = currentDepth;
        traverse(node.out, [...nodeStack, node], currentDepth + (node.skip ? 0 : 1));
      }
    }
  }
}
