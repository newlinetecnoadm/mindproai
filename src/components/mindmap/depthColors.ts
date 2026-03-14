import type { Node, Edge } from "@xyflow/react";

/**
 * Color palette per depth level.
 * Depth 0 = root (orange/primary), depth 1+ = rotating palette.
 * Children of the same parent share the parent's assigned color family.
 */
const DEPTH_COLORS = [
  "orange",  // depth 0 — root
  "blue",    // depth 1
  "green",   // depth 2
  "purple",  // depth 3
  "red",     // depth 4
  "yellow",  // depth 5
];

export function getColorForDepth(depth: number): string {
  if (depth <= 0) return "orange";
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

/**
 * Compute the depth of a node in the tree defined by edges.
 */
export function getNodeDepth(nodeId: string, edges: Edge[]): number {
  let depth = 0;
  let current = nodeId;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    const parentEdge = edges.find((e) => e.target === current);
    if (!parentEdge) break;
    current = parentEdge.source;
    depth++;
  }
  return depth;
}

/**
 * Build a depth map for all nodes.
 */
export function buildDepthMap(nodes: Node[], edges: Edge[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const node of nodes) {
    map.set(node.id, getNodeDepth(node.id, edges));
  }
  return map;
}

/**
 * Assign colors to all nodes based on their depth in the tree.
 */
export function assignDepthColors(nodes: Node[], edges: Edge[]): Node[] {
  const depthMap = buildDepthMap(nodes, edges);
  return nodes.map((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    const isRoot = (node.data as any)?.isRoot;
    return {
      ...node,
      data: {
        ...node.data,
        color: isRoot ? "orange" : getColorForDepth(depth),
      },
    };
  });
}
