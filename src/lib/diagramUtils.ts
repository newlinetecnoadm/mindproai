import type { Node, Edge } from "@xyflow/react";

// Layout constants
export const ROOT_WIDTH = 180;
export const ROOT_HEIGHT = 40;
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 28;
export const ORG_NODE_WIDTH = 200;
export const ORG_NODE_HEIGHT = 60;
export const TL_NODE_WIDTH = 180;
export const TL_NODE_HEIGHT = 70;
export const CONCEPT_NODE_WIDTH = 160;
export const CONCEPT_NODE_HEIGHT = 48;
export const ORG_H_GAP = 80;
export const ORG_V_GAP = 70;
export const TL_GAP = 40;
export const CONCEPT_RADIUS = 220;

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

/**
 * Returns the dimensions (width, height) of a node.
 * Priorities:
 * 1. node.measured (actual DOM measurement)
 * 2. node.width/height (manually set dimensions)
 * 3. Type-specific estimation based on content (label/subLabel)
 */
export function getNodeDimensions(node: Node): { w: number; h: number } {
  // 1. React Flow measured dimensions (actual rendered size)
  if (node.measured?.width !== undefined && node.measured?.height !== undefined) {
    return { w: node.measured.width, h: node.measured.height };
  }

  // 2. Manually set width/height attributes
  if (node.width !== undefined && node.height !== undefined) {
    return { w: node.width, h: node.height };
  }

  // 3. Fallback: Estimation logic
  const label = (node.data as any)?.label || "";
  const subLabel = (node.data as any)?.subLabel || (node.data as any)?.role || "";

  // Base width estimation: 9px per char + padding
  const estW = Math.max(80, Math.max(label.length * 9, subLabel.length * 7) + 24);
  const isRoot = (node.data as any)?.isRoot;
  const isAltOrg = (node as any).type === "org" || (node as any).type === "org_mindmap";

  if (isRoot) {
    return { w: Math.max(ROOT_WIDTH, estW), h: ROOT_HEIGHT };
  }

  // Specific node type overrides
  switch (node.type) {
    case "org":
    case "org_mindmap":
      return { w: estW, h: subLabel ? 54 : 40 };
    case "timeline":
      return { w: TL_NODE_WIDTH, h: TL_NODE_HEIGHT };
    case "concept":
      return { w: CONCEPT_NODE_WIDTH, h: CONCEPT_NODE_HEIGHT };
    case "mindmap":
      return { w: estW, h: NODE_HEIGHT };
    default:
      return { w: NODE_WIDTH, h: NODE_HEIGHT };
  }
}
