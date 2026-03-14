import type { Node, Edge } from "@xyflow/react";

/**
 * Color palette for depth-1 branches.
 * Each direct child of root gets a unique color.
 * All descendants inherit that branch color.
 */
const BRANCH_COLORS = ["blue", "green", "purple", "red", "yellow", "orange"];

export function getColorForDepth(depth: number): string {
  if (depth <= 0) return "orange";
  return BRANCH_COLORS[(depth - 1) % BRANCH_COLORS.length];
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
 * Find the depth-1 ancestor of a node (the direct child of root).
 * Returns the node's own id if it IS the depth-1 node.
 */
function findBranchAncestorId(nodeId: string, edges: Edge[]): string | null {
  const chain: string[] = [];
  let current = nodeId;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    chain.unshift(current);
    const parentEdge = edges.find((e) => e.target === current);
    if (!parentEdge) break;
    current = parentEdge.source;
  }
  // chain[0] = root, chain[1] = depth-1 branch ancestor
  if (chain.length >= 2) return chain[1];
  return null;
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
 * Assign colors to all nodes based on their branch (depth-1 ancestor).
 * - Root: orange, full style
 * - Depth 1: full color (bg + text + border in that color)
 * - Depth 2+: "branch" variant — white/default bg, but text & border inherit branch color
 */
export function assignDepthColors(nodes: Node[], edges: Edge[]): Node[] {
  const depthMap = buildDepthMap(nodes, edges);

  // Find all depth-1 nodes and assign them rotating colors
  const depth1Nodes = nodes.filter((n) => depthMap.get(n.id) === 1);
  const depth1ColorMap = new Map<string, string>();
  depth1Nodes.forEach((n, i) => {
    depth1ColorMap.set(n.id, BRANCH_COLORS[i % BRANCH_COLORS.length]);
  });

  return nodes.map((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    const isRoot = (node.data as any)?.isRoot;

    if (isRoot || depth === 0) {
      return { ...node, data: { ...node.data, color: "orange" } };
    }

    // Find branch ancestor (depth-1) to get the branch color
    const branchAncestorId = findBranchAncestorId(node.id, edges);
    const branchColor = branchAncestorId ? depth1ColorMap.get(branchAncestorId) : undefined;
    const color = branchColor || getColorForDepth(depth);

    if (depth === 1) {
      // Full colored node
      return { ...node, data: { ...node.data, color } };
    }

    // Depth 2+: branch variant (white bg, colored text/border)
    return { ...node, data: { ...node.data, color, variant: "branch" } };
  });
}
