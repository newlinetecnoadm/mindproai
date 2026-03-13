import type { Node, Edge } from "@xyflow/react";

const ROOT_WIDTH = 200;
const ROOT_HEIGHT = 60;
const NODE_WIDTH = 180;
const NODE_HEIGHT = 48;
const H_GAP = 80;
const V_GAP = 24;

// Org chart constants
const ORG_NODE_WIDTH = 180;
const ORG_NODE_HEIGHT = 60;
const ORG_H_GAP = 40;
const ORG_V_GAP = 60;

// Timeline constants
const TL_NODE_WIDTH = 180;
const TL_NODE_HEIGHT = 70;
const TL_GAP = 40;

// Concept map constants
const CONCEPT_NODE_WIDTH = 160;
const CONCEPT_NODE_HEIGHT = 48;
const CONCEPT_RADIUS = 220;

interface TreeNode {
  id: string;
  children: TreeNode[];
  subtreeHeight: number;
  node: Node;
  isRoot: boolean;
}

// ─── Tree helpers ────────────────────────────────────────

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

  let rootId = nodes.find((n) => (n.data as any).isRoot)?.id;
  if (!rootId) rootId = nodes.find((n) => !hasParent.has(n.id))?.id;
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
        : Math.max(nodeH, children.reduce((sum, c) => sum + c.subtreeHeight, 0) + (children.length - 1) * V_GAP);

    return { id, children, subtreeHeight, node, isRoot };
  }

  return build(rootId, 0);
}

// ─── Mindmap layout (balanced: root center, children alternating sides) ─────

function getGroupHeight(group: TreeNode[]): number {
  if (group.length === 0) return 0;
  return group.reduce((sum, node) => sum + node.subtreeHeight, 0) + (group.length - 1) * V_GAP;
}

function layoutMindmapBranch(
  tree: TreeNode,
  x: number,
  yStart: number,
  direction: 1 | -1,
  positions: Map<string, { x: number; y: number }>
) {
  const y = yStart + tree.subtreeHeight / 2 - NODE_HEIGHT / 2;
  positions.set(tree.id, { x, y });

  if (tree.children.length === 0) return;

  let childY = yStart;
  for (const child of tree.children) {
    const childX = direction === 1 ? x + NODE_WIDTH + H_GAP : x - NODE_WIDTH - H_GAP;
    layoutMindmapBranch(child, childX, childY, direction, positions);
    childY += child.subtreeHeight + V_GAP;
  }
}

function layoutMindmapBalanced(tree: TreeNode, positions: Map<string, { x: number; y: number }>) {
  positions.set(tree.id, { x: -ROOT_WIDTH / 2, y: -ROOT_HEIGHT / 2 });

  if (tree.children.length === 0) return;

  const rightChildren = tree.children.filter((_, index) => index % 2 === 0);
  const leftChildren = tree.children.filter((_, index) => index % 2 === 1);

  let rightY = -getGroupHeight(rightChildren) / 2;
  for (const child of rightChildren) {
    layoutMindmapBranch(child, ROOT_WIDTH / 2 + H_GAP, rightY, 1, positions);
    rightY += child.subtreeHeight + V_GAP;
  }

  let leftY = -getGroupHeight(leftChildren) / 2;
  for (const child of leftChildren) {
    layoutMindmapBranch(child, -(ROOT_WIDTH / 2 + H_GAP + NODE_WIDTH), leftY, -1, positions);
    leftY += child.subtreeHeight + V_GAP;
  }
}

// ─── Org chart layout (top-down centered tree) ──────────

function buildOrgTree(nodes: Node[], edges: Edge[]) {
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
  let rootId = nodes.find((n) => (n.data as any).isRoot)?.id;
  if (!rootId) rootId = nodes.find((n) => !hasParent.has(n.id))?.id;
  if (!rootId) return null;

  interface OrgTreeNode { id: string; children: OrgTreeNode[]; subtreeWidth: number; }

  function build(id: string): OrgTreeNode | null {
    if (!nodeMap.has(id)) return null;
    const childIds = childrenMap.get(id) || [];
    const children = childIds.map((c) => build(c)).filter(Boolean) as OrgTreeNode[];
    const subtreeWidth = children.length === 0
      ? ORG_NODE_WIDTH
      : children.reduce((s, c) => s + c.subtreeWidth, 0) + (children.length - 1) * ORG_H_GAP;
    return { id, children, subtreeWidth };
  }
  return build(rootId);
}

function layoutOrgTree(
  tree: { id: string; children: any[]; subtreeWidth: number },
  x: number,
  y: number,
  positions: Map<string, { x: number; y: number }>
) {
  positions.set(tree.id, { x: x + tree.subtreeWidth / 2 - ORG_NODE_WIDTH / 2, y });
  if (tree.children.length === 0) return;
  let childX = x;
  for (const child of tree.children) {
    layoutOrgTree(child, childX, y + ORG_NODE_HEIGHT + ORG_V_GAP, positions);
    childX += child.subtreeWidth + ORG_H_GAP;
  }
}

// ─── Timeline layout (horizontal sequential) ───────────

function layoutTimeline(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  // Order by edges (chain)
  const childMap = new Map<string, string>();
  const hasParent = new Set<string>();
  edges.forEach((e) => { childMap.set(e.source, e.target); hasParent.add(e.target); });
  
  let startId = nodes.find((n) => !hasParent.has(n.id))?.id;
  if (!startId && nodes.length > 0) startId = nodes[0].id;
  
  const ordered: string[] = [];
  const visited = new Set<string>();
  let current = startId;
  while (current && !visited.has(current)) {
    visited.add(current);
    ordered.push(current);
    current = childMap.get(current) as string;
  }
  // Add any unvisited nodes
  nodes.forEach((n) => { if (!visited.has(n.id)) ordered.push(n.id); });

  ordered.forEach((id, i) => {
    positions.set(id, { x: i * (TL_NODE_WIDTH + TL_GAP), y: 0 });
  });
  return positions;
}

// ─── Concept map layout (radial from root) ──────────────

function layoutConceptMap(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();
  edges.forEach((e) => {
    const arr = childrenMap.get(e.source) || [];
    arr.push(e.target);
    childrenMap.set(e.source, arr);
    hasParent.add(e.target);
  });

  let rootId = nodes.find((n) => (n.data as any).isRoot)?.id;
  if (!rootId) rootId = nodes.find((n) => !hasParent.has(n.id))?.id;
  if (!rootId) rootId = nodes[0].id;

  // Place root at center
  positions.set(rootId, { x: 0, y: 0 });

  const visited = new Set<string>([rootId]);

  function layoutLevel(parentId: string, parentX: number, parentY: number, startAngle: number, sweep: number, radius: number) {
    const childIds = (childrenMap.get(parentId) || []).filter((id) => !visited.has(id));
    if (childIds.length === 0) return;

    const angleStep = sweep / Math.max(childIds.length, 1);
    childIds.forEach((cid, i) => {
      visited.add(cid);
      const angle = startAngle + angleStep * (i + 0.5);
      const cx = parentX + radius * Math.cos(angle);
      const cy = parentY + radius * Math.sin(angle);
      positions.set(cid, { x: cx - CONCEPT_NODE_WIDTH / 2, y: cy - CONCEPT_NODE_HEIGHT / 2 });

      // Recurse with a narrower sweep
      const childSweep = Math.min(sweep / childIds.length, Math.PI * 0.8);
      layoutLevel(cid, cx, cy, angle - childSweep / 2, childSweep, radius * 0.75);
    });
  }

  const directChildren = (childrenMap.get(rootId) || []).filter((id) => !visited.has(id));
  if (directChildren.length > 0) {
    layoutLevel(rootId, CONCEPT_NODE_WIDTH / 2, CONCEPT_NODE_HEIGHT / 2, -Math.PI / 2, Math.PI * 2, CONCEPT_RADIUS);
  }

  return positions;
}

// ─── Handle selection ───────────────────────────────────

function getBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  srcW: number, srcH: number, tgtW: number, tgtH: number
): { sourceHandle: string; targetHandle: string } {
  const srcCx = sourcePos.x + srcW / 2;
  const srcCy = sourcePos.y + srcH / 2;
  const tgtCx = targetPos.x + tgtW / 2;
  const tgtCy = targetPos.y + tgtH / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;

  // Source handle: pick the side closest to the target
  const sourceHandle = Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? "right" : "left")
    : (dy > 0 ? "bottom" : "top");

  // Target handle: pick the side closest to the source (opposite direction)
  const targetHandle = Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? "left" : "right")
    : (dy > 0 ? "top" : "bottom");

  return { sourceHandle, targetHandle };
}

// ─── Center positions around origin ─────────────────────

function centerPositions(positions: Map<string, { x: number; y: number }>, defaultW = NODE_WIDTH, defaultH = NODE_HEIGHT) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + defaultW);
    maxY = Math.max(maxY, pos.y + defaultH);
  });
  const offsetX = -(minX + maxX) / 2;
  const offsetY = -(minY + maxY) / 2;
  positions.forEach((pos, id) => {
    positions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
  });
}

// ─── Public API ─────────────────────────────────────────

export function autoLayoutMindMap(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const tree = buildTree(nodes, edges);
  if (!tree) return { nodes, edges };

  const positions = new Map<string, { x: number; y: number }>();
  layoutMindmapBalanced(tree, positions);

  return applyPositions(nodes, edges, positions, "mindmap");
}

export function autoLayoutDiagram(
  nodes: Node[],
  edges: Edge[],
  diagramType: string
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  let positions: Map<string, { x: number; y: number }>;

  switch (diagramType) {
    case "mindmap":
      return autoLayoutMindMap(nodes, edges);

    case "orgchart": {
      const tree = buildOrgTree(nodes, edges);
      if (!tree) return { nodes, edges };
      positions = new Map();
      layoutOrgTree(tree, 0, 0, positions);
      centerPositions(positions, ORG_NODE_WIDTH, ORG_NODE_HEIGHT);
      break;
    }

    case "timeline": {
      positions = layoutTimeline(nodes, edges);
      centerPositions(positions, TL_NODE_WIDTH, TL_NODE_HEIGHT);
      break;
    }

    case "concept_map": {
      positions = layoutConceptMap(nodes, edges);
      centerPositions(positions, CONCEPT_NODE_WIDTH, CONCEPT_NODE_HEIGHT);
      break;
    }

    default:
      return autoLayoutMindMap(nodes, edges);
  }

  return applyPositions(nodes, edges, positions, diagramType);
}

function getNodeDimensions(node: Node): { w: number; h: number } {
  const d = node.data as any;
  if (d?.isRoot) return { w: ROOT_WIDTH, h: ROOT_HEIGHT };
  const type = node.type;
  if (type === "org") return { w: ORG_NODE_WIDTH, h: ORG_NODE_HEIGHT };
  if (type === "timeline") return { w: TL_NODE_WIDTH, h: TL_NODE_HEIGHT };
  if (type === "concept") return { w: CONCEPT_NODE_WIDTH, h: CONCEPT_NODE_HEIGHT };
  return { w: NODE_WIDTH, h: NODE_HEIGHT };
}

function applyPositions(
  nodes: Node[],
  edges: Edge[],
  positions: Map<string, { x: number; y: number }>
): { nodes: Node[]; edges: Edge[] } {
  const newNodes = nodes.map((n) => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });

  const newEdges = edges.map((e) => {
    const srcPos = positions.get(e.source);
    const tgtPos = positions.get(e.target);
    if (srcPos && tgtPos) {
      const srcNode = nodes.find((n) => n.id === e.source);
      const tgtNode = nodes.find((n) => n.id === e.target);
      const { w: srcW, h: srcH } = srcNode ? getNodeDimensions(srcNode) : { w: NODE_WIDTH, h: NODE_HEIGHT };
      const { w: tgtW, h: tgtH } = tgtNode ? getNodeDimensions(tgtNode) : { w: NODE_WIDTH, h: NODE_HEIGHT };

      const { sourceHandle, targetHandle } = getBestHandles(srcPos, tgtPos, srcW, srcH, tgtW, tgtH);
      return { ...e, sourceHandle, targetHandle, type: "smoothstep" };
    }
    return e;
  });

  return { nodes: newNodes, edges: newEdges };
}
