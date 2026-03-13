import type { Node, Edge } from "@xyflow/react";

const ROOT_WIDTH = 200;
const ROOT_HEIGHT = 60;
const NODE_WIDTH = 180;
const NODE_HEIGHT = 44;
const H_GAP = 80; // horizontal gap between levels
const V_GAP = 30; // vertical gap between siblings

interface TreeNode {
  id: string;
  children: TreeNode[];
  subtreeHeight: number;
  node: Node;
  isRoot: boolean;
}

/**
 * Build a tree structure from flat nodes + edges.
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

  // Find root (node with isRoot flag, or node without parent)
  let rootId = nodes.find((n) => (n.data as any).isRoot)?.id;
  if (!rootId) {
    rootId = nodes.find((n) => !hasParent.has(n.id))?.id;
  }
  if (!rootId) return null;

  function build(id: string, depth: number): TreeNode | null {
    const node = nodeMap.get(id);
    if (!node) return null;

    const isRoot = !!(node.data as any).isRoot || depth === 0;
    const childIds = childrenMap.get(id) || [];
    const children = childIds.map((cid) => build(cid, depth + 1)).filter(Boolean) as TreeNode[];

    const nodeH = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;
    const subtreeHeight =
      children.length === 0
        ? nodeH
        : Math.max(
            nodeH,
            children.reduce((sum, c) => sum + c.subtreeHeight, 0) +
              (children.length - 1) * V_GAP
          );

    return { id, children, subtreeHeight, node, isRoot };
  }

  return build(rootId, 0);
}

/**
 * Layout the tree: root is centered, children fan out to the right.
 */
function layoutTree(
  tree: TreeNode,
  x: number,
  yStart: number,
  positions: Map<string, { x: number; y: number }>
) {
  const nodeH = tree.isRoot ? ROOT_HEIGHT : NODE_HEIGHT;
  const nodeW = tree.isRoot ? ROOT_WIDTH : NODE_WIDTH;

  // Center this node vertically within its subtree
  const y = yStart + tree.subtreeHeight / 2 - nodeH / 2;
  positions.set(tree.id, { x, y });

  if (tree.children.length === 0) return;

  let childY = yStart;
  for (const child of tree.children) {
    layoutTree(child, x + nodeW + H_GAP, childY, positions);
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
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx >= absDy) {
    return dx > 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  } else {
    return dy > 0
      ? { sourceHandle: "bottom", targetHandle: "top" }
      : { sourceHandle: "top", targetHandle: "bottom" };
  }
}

/**
 * Apply auto-layout to mind map nodes and update edge handles.
 */
export function autoLayoutMindMap(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const tree = buildTree(nodes, edges);
  if (!tree) return { nodes, edges };

  const positions = new Map<string, { x: number; y: number }>();
  layoutTree(tree, 0, 0, positions);

  // Center tree around origin for better fitView
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + NODE_WIDTH);
    maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
  });
  const offsetX = -(minX + maxX) / 2;
  const offsetY = -(minY + maxY) / 2;

  const newNodes = nodes.map((n) => {
    const pos = positions.get(n.id);
    if (pos) {
      return { ...n, position: { x: pos.x + offsetX, y: pos.y + offsetY } };
    }
    return n;
  });

  const newEdges = edges.map((e) => {
    const srcPos = positions.get(e.source);
    const tgtPos = positions.get(e.target);
    if (srcPos && tgtPos) {
      const srcNode = nodes.find((n) => n.id === e.source);
      const tgtNode = nodes.find((n) => n.id === e.target);
      const srcW = (srcNode?.data as any)?.isRoot ? ROOT_WIDTH : NODE_WIDTH;
      const srcH = (srcNode?.data as any)?.isRoot ? ROOT_HEIGHT : NODE_HEIGHT;
      const tgtW = (tgtNode?.data as any)?.isRoot ? ROOT_WIDTH : NODE_WIDTH;
      const tgtH = (tgtNode?.data as any)?.isRoot ? ROOT_HEIGHT : NODE_HEIGHT;

      const { sourceHandle, targetHandle } = getBestHandles(
        { x: srcPos.x + srcW / 2, y: srcPos.y + srcH / 2 },
        { x: tgtPos.x + tgtW / 2, y: tgtPos.y + tgtH / 2 }
      );
      return { ...e, sourceHandle, targetHandle, type: "smoothstep" };
    }
    return e;
  });

  return { nodes: newNodes, edges: newEdges };
}
