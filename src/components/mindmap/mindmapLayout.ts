import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const H_GAP = 60; // horizontal gap between levels
const V_GAP = 20; // vertical gap between siblings

interface TreeNode {
  id: string;
  children: TreeNode[];
  subtreeHeight: number;
  node: Node;
}

/**
 * Build a tree structure from flat nodes + edges
 */
function buildTree(nodes: Node[], edges: Edge[]): TreeNode | null {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();

  edges.forEach((e) => {
    const arr = childrenMap.get(e.source) || [];
    arr.push(e.target);
    childrenMap.set(e.source, arr);
    hasParent.add(e.target);
  });

  // Find root (node without parent, or isRoot)
  let rootId = nodes.find((n) => (n.data as any).isRoot)?.id;
  if (!rootId) {
    rootId = nodes.find((n) => !hasParent.has(n.id))?.id;
  }
  if (!rootId) return null;

  function build(id: string): TreeNode | null {
    const node = nodeMap.get(id);
    if (!node) return null;

    const childIds = childrenMap.get(id) || [];
    const children = childIds.map((cid) => build(cid)).filter(Boolean) as TreeNode[];

    const subtreeHeight =
      children.length === 0
        ? NODE_HEIGHT
        : children.reduce((sum, c) => sum + c.subtreeHeight, 0) +
          (children.length - 1) * V_GAP;

    return { id, children, subtreeHeight, node };
  }

  return build(rootId);
}

/**
 * Layout the tree, positioning nodes to avoid overlap.
 * Root is centered; children fan out to the right.
 */
function layoutTree(
  tree: TreeNode,
  x: number,
  yStart: number,
  positions: Map<string, { x: number; y: number }>
) {
  // Center this node vertically within its subtree
  const y = yStart + tree.subtreeHeight / 2 - NODE_HEIGHT / 2;
  positions.set(tree.id, { x, y });

  let childY = yStart;
  for (const child of tree.children) {
    layoutTree(child, x + NODE_WIDTH + H_GAP, childY, positions);
    childY += child.subtreeHeight + V_GAP;
  }
}

/**
 * Determine the best sourceHandle and targetHandle based on relative positions.
 */
function getBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // Determine direction from source center to target center
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let sourceHandle: string;
  let targetHandle: string;

  if (absDx >= absDy) {
    // Horizontal dominant
    if (dx > 0) {
      sourceHandle = "right";
      targetHandle = "left";
    } else {
      sourceHandle = "left";
      targetHandle = "right";
    }
  } else {
    // Vertical dominant
    if (dy > 0) {
      sourceHandle = "bottom";
      targetHandle = "top";
    } else {
      sourceHandle = "top";
      targetHandle = "bottom";
    }
  }

  return { sourceHandle, targetHandle };
}

/**
 * Apply auto-layout to mind map nodes and update edge handles.
 * Returns new nodes and edges arrays.
 */
export function autoLayoutMindMap(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const tree = buildTree(nodes, edges);
  if (!tree) return { nodes, edges };

  const positions = new Map<string, { x: number; y: number }>();
  layoutTree(tree, 0, 0, positions);

  // Collect positioned node IDs
  const positionedIds = new Set(positions.keys());

  // Update node positions (only for nodes in the tree)
  const newNodes = nodes.map((n) => {
    const pos = positions.get(n.id);
    if (pos) {
      return { ...n, position: pos };
    }
    return n;
  });

  // Update edge handles based on new positions
  const newEdges = edges.map((e) => {
    const srcPos = positions.get(e.source);
    const tgtPos = positions.get(e.target);
    if (srcPos && tgtPos) {
      const { sourceHandle, targetHandle } = getBestHandles(
        { x: srcPos.x + NODE_WIDTH / 2, y: srcPos.y + NODE_HEIGHT / 2 },
        { x: tgtPos.x + NODE_WIDTH / 2, y: tgtPos.y + NODE_HEIGHT / 2 }
      );
      return {
        ...e,
        sourceHandle,
        targetHandle,
        type: "smoothstep",
      };
    }
    return e;
  });

  return { nodes: newNodes, edges: newEdges };
}
