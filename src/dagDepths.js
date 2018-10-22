export default function({ nodes, links }, idAccessor) {
  // linked graph
  const graph = {};

  nodes.forEach(node => graph[idAccessor(node)] = { data: node, out : [], depth: -1 });
  links.forEach(({ source, target }) => {
    const sourceId = getNodeId(source);
    const targetId = getNodeId(target);
    if (!graph.hasOwnProperty(sourceId)) throw `Missing source node with id: ${sourceId}`;
    if (!graph.hasOwnProperty(targetId)) throw `Missing target node with id: ${targetId}`;
    const sourceNode = graph[sourceId];
    const targetNode = graph[targetId];

    sourceNode.out.push(targetNode);

    function getNodeId(node) {
      return typeof node === 'object' ? idAccessor(node) : node;
    }
  });

  traverse(Object.values(graph));

  // cleanup
  Object.keys(graph).forEach(id => graph[id] = graph[id].depth);

  return graph;

  function traverse(nodes, nodeStack = []) {
    const currentDepth = nodeStack.length;
    for (var i=0, l=nodes.length; i<l; i++) {
      const node = nodes[i];
      if (nodeStack.indexOf(node) !== -1) {
        throw `Invalid DAG structure! Found cycle from node ${idAccessor(nodeStack[nodeStack.length - 1].data)} to ${idAccessor(node.data)}`;
      }
      if (currentDepth > node.depth) { // Don't unnecessarily revisit chunks of the graph
        node.depth = currentDepth;
        traverse(node.out, [...nodeStack, node]);
      }
    }
  }
}