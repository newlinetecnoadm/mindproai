import type { Node, Edge } from "@xyflow/react";

/**
 * Returns all descendant node IDs for a given node using BFS.
 */
export function getDescendants(nodeId: string, edges: Edge[]): string[] {
  const result: string[] = [];
  const queue = [nodeId];
  const visited = new Set<string>([nodeId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target);
        result.push(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return result;
}

/**
 * Returns only the direct children of a node.
 */
export function getDirectChildren(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const childIds = edges.filter((e) => e.source === nodeId).map((e) => e.target);
  return nodes.filter(n => childIds.includes(n.id));
}

/**
 * Toggles collapse/expand for a node.
 * This function only modifies the `isCollapsed` data property.
 * The actual visibility (hidden property) of nodes and edges is evaluated by `getVisibleGraph`.
 */
export function toggleNodeCollapse(nodeId: string, nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.id === nodeId) {
      return {
        ...n,
        data: {
          ...n.data,
          isCollapsed: !n.data?.isCollapsed
        }
      };
    }
    return n;
  });
}

export function getVisibleGraph(nodes: Node[], edges: Edge[]): { visibleNodes: Node[], visibleEdges: Edge[] } {
  // Find all roots
  const roots = nodes.filter((n) => !edges.some((e) => e.target === n.id));
  
  const visibleNodeIds = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const node = queue.shift()!;
    visibleNodeIds.add(node.id);

    // If not collapsed, add children to queue
    if (!node.data?.isCollapsed) {
      const children = getDirectChildren(node.id, nodes, edges);
      queue.push(...children);
    }
  }

  // A visible node is one that is in the visibleNodeIds set
  const visibleNodes = nodes.map(n => ({
    ...n,
    hidden: !visibleNodeIds.has(n.id)
  }));

  // A visible edge is one where both source and target are not hidden (in the visible nodes set)
  const visibleEdges = edges.map(e => ({
    ...e,
    hidden: !visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)
  }));

  return { visibleNodes, visibleEdges };
}
