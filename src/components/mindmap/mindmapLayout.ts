import type { Node, Edge } from "@xyflow/react";
import { useMindMapStore } from "@/store/useMindMapStore";
import { 
  getNodeDimensions, 
  ROOT_WIDTH, 
  ROOT_HEIGHT, 
  NODE_WIDTH, 
  NODE_HEIGHT, 
  ORG_H_GAP, 
  ORG_V_GAP,
  TL_GAP,
  CONCEPT_RADIUS,
  CONCEPT_NODE_WIDTH,
  CONCEPT_NODE_HEIGHT,
  TL_NODE_WIDTH,
  TL_NODE_HEIGHT
} from "@/lib/diagramUtils";

const V_GAP = 32;
const H_GAP = 72;

interface TreeNode {
  id: string;
  children: TreeNode[];
  subtreeHeight: number;
  node: Node;
  isRoot: boolean;
}

// ─── Tree helpers ────────────────────────────────────────

function buildTrees(nodes: Node[], edges: Edge[]): TreeNode[] {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();

  edges.forEach((e) => {
    // CRITICAL: Manual cross-links (isCustom) should NOT affect layout hierarchy
    if ((e.data as any)?.isCustom) return;

    const arr = childrenMap.get(e.source) || [];
    arr.push(e.target);
    childrenMap.set(e.source, arr);
    hasParent.add(e.target);
  });

  const roots = nodes.filter((n) => !!(n.data as any).isRoot || !hasParent.has(n.id));
  const visited = new Set<string>();

  function build(id: string, depth: number): TreeNode | null {
    if (visited.has(id)) return null;
    const node = nodeMap.get(id);
    if (!node || node.hidden) return null;

    visited.add(id);

    const isRoot = !!(node.data as any).isRoot || depth === 0;
    const childIds = childrenMap.get(id) || [];
    const children = childIds.map((cid) => build(cid, depth + 1)).filter(Boolean) as TreeNode[];

    const { h: nodeH } = getNodeDimensions(node);
    const subtreeHeight =
      children.length === 0
        ? nodeH
        : Math.max(nodeH, children.reduce((sum, c) => sum + c.subtreeHeight, 0) + (children.length - 1) * V_GAP);

    return { id, children, subtreeHeight, node, isRoot };
  }

  return roots.map((r) => build(r.id, 0)).filter(Boolean) as TreeNode[];
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
  positions: Map<string, { x: number; y: number }>,
  sideMap: Map<string, "left" | "right">
) {
  const { h: nodeH, w: nodeW } = getNodeDimensions(tree.node);
  const y = yStart + tree.subtreeHeight / 2 - nodeH / 2;
  positions.set(tree.id, { x, y });

  // Record side for ALL nodes in the branch (root gets no side entry).
  if (!tree.isRoot) {
    sideMap.set(tree.id, direction === 1 ? "right" : "left");
  }

  if (tree.children.length === 0) return;

  let childY = yStart;
  for (const child of tree.children) {
    const { w: childW } = getNodeDimensions(child.node);
    const childX = direction === 1 ? x + nodeW + H_GAP : x - childW - H_GAP;
    // direction propagates to ALL descendants
    layoutMindmapBranch(child, childX, childY, direction, positions, sideMap);
    childY += child.subtreeHeight + V_GAP;
  }
}

function countDescendants(tree: TreeNode): number {
  let count = 1;
  for (const child of tree.children) {
    count += countDescendants(child);
  }
  return count;
}

function layoutMindmapBalanced(tree: TreeNode, positions: Map<string, { x: number; y: number }>, sideMap: Map<string, "left" | "right">) {
  const { h: rootH, w: rootW } = getNodeDimensions(tree.node);
  positions.set(tree.id, { x: -rootW / 2, y: -rootH / 2 });

  if (tree.children.length === 0) return;

  // Balance by subtree weight: sort children by descendant count descending,
  // then greedily assign to the lighter side
  const childrenWithWeight = tree.children.map((child) => ({
    child,
    weight: child.subtreeHeight,
  }));
  childrenWithWeight.sort((a, b) => b.weight - a.weight);

  const rightChildren: TreeNode[] = [];
  const leftChildren: TreeNode[] = [];
  let rightWeight = 0;
  let leftWeight = 0;

  for (const { child, weight } of childrenWithWeight) {
    if (rightWeight <= leftWeight) {
      rightChildren.push(child);
      rightWeight += weight;
    } else {
      leftChildren.push(child);
      leftWeight += weight;
    }
  }

  let rightY = -getGroupHeight(rightChildren) / 2;
  for (const child of rightChildren) {
    layoutMindmapBranch(child, rootW / 2 + H_GAP, rightY, 1, positions, sideMap);
    rightY += child.subtreeHeight + V_GAP;
  }

  let leftY = -getGroupHeight(leftChildren) / 2;
  for (const child of leftChildren) {
    const { w: childW } = getNodeDimensions(child.node);
    layoutMindmapBranch(child, -(rootW / 2 + H_GAP + childW), leftY, -1, positions, sideMap);
    leftY += child.subtreeHeight + V_GAP;
  }
}

function layoutMindmapUnilateral(tree: TreeNode, positions: Map<string, { x: number; y: number }>, sideMap: Map<string, "left" | "right">) {
  const { h: rootH, w: rootW } = getNodeDimensions(tree.node);
  positions.set(tree.id, { x: -rootW / 2, y: -rootH / 2 });

  if (tree.children.length === 0) return;

  let childY = -getGroupHeight(tree.children) / 2;
  for (const child of tree.children) {
    layoutMindmapBranch(child, rootW / 2 + H_GAP, childY, 1, positions, sideMap);
    childY += child.subtreeHeight + V_GAP;
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

  interface OrgTreeNode { id: string; children: OrgTreeNode[]; subtreeWidth: number; node: Node; childCenterGap?: number; }

  function build(id: string): OrgTreeNode | null {
    const node = nodeMap.get(id);
    if (!node || node.hidden) return null;
    const childIds = childrenMap.get(id) || [];
    const children = childIds.map((c) => build(c)).filter(Boolean) as OrgTreeNode[];
    const { w: nodeW } = getNodeDimensions(node);
    
    let subtreeWidth = nodeW;
    let childCenterGap = 0;

    if (children.length > 0) {
      // Balanced Org Layout:
      // We want siblings to have EQUAL center-to-center distance if possible.
      // Constraint: Center_{i+1} - Center_i >= (SubtreeWidth_i + SubtreeWidth_{i+1})/2 + ORG_H_GAP
      let maxRequiredGap = 0;
      for (let i = 0; i < children.length - 1; i++) {
        const gap = (children[i].subtreeWidth + children[i+1].subtreeWidth) / 2 + ORG_H_GAP;
        maxRequiredGap = Math.max(maxRequiredGap, gap);
      }
      childCenterGap = maxRequiredGap;
      // Total width is based on the gaps between centers + the half-widths of the first and last subtrees
      const totalWidth = (children.length - 1) * childCenterGap + (children[0].subtreeWidth + children[children.length - 1].subtreeWidth) / 2;
      subtreeWidth = Math.max(nodeW, totalWidth);
    }

    return { id, children, subtreeWidth, node, childCenterGap };
  }
  return build(rootId);
}

function layoutOrgTree(
  tree: { id: string; children: any[]; subtreeWidth: number; node: Node, childCenterGap?: number },
  x: number,
  y: number,
  positions: Map<string, { x: number; y: number }>
) {
  const { h: nodeH, w: nodeW } = getNodeDimensions(tree.node);
  const parentCenterX = x + tree.subtreeWidth / 2;
  positions.set(tree.id, { x: parentCenterX - nodeW / 2, y });
  
  if (tree.children.length === 0) return;
  
  const gap = tree.childCenterGap || ORG_H_GAP;
  const numChildren = tree.children.length;
  
  // Dynamic vertical step: find the max height among all siblings at this level
  // to ensure the next row starts at the same Y.
  const maxChildHeight = Math.max(...tree.children.map(c => getNodeDimensions(c.node).h));
  const verticalStep = Math.max(100, nodeH / 2 + ORG_V_GAP + maxChildHeight / 2);

  for (let i = 0; i < numChildren; i++) {
    const child = tree.children[i];
    const childCenterX = parentCenterX + (i - (numChildren - 1) / 2) * gap;
    const childSubtreeX = childCenterX - child.subtreeWidth / 2;
    layoutOrgTree(child, childSubtreeX, y + verticalStep, positions);
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
  nodes.forEach((n) => { if (!visited.has(n.id) && !n.hidden) ordered.push(n.id); });

  let currentX = 0;
  ordered.forEach((id) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const { w: nodeW } = getNodeDimensions(node);
    positions.set(id, { x: currentX, y: 0 });
    currentX += nodeW + TL_GAP;
  });
  return positions;
}

// ─── Concept map layout (radial from root) ──────────────

function layoutConceptMap(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

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
    const childIds = (childrenMap.get(parentId) || []).filter((id) => {
      const n = nodeMap.get(id);
      return !visited.has(id) && n && !n.hidden;
    });
    if (childIds.length === 0) return;

    const angleStep = sweep / Math.max(childIds.length, 1);
    childIds.forEach((cid, i) => {
      visited.add(cid);
      const angle = startAngle + angleStep * (i + 0.5);
      const cx = parentX + radius * Math.cos(angle);
      const cy = parentY + radius * Math.sin(angle);
      
      const childNode = nodes.find(n => n.id === cid);
      if (childNode) {
        const { w: childW, h: childH } = getNodeDimensions(childNode);
        positions.set(cid, { x: cx - childW / 2, y: cy - childH / 2 });
      } else {
        positions.set(cid, { x: cx - CONCEPT_NODE_WIDTH / 2, y: cy - CONCEPT_NODE_HEIGHT / 2 });
      }

      // Recurse with a narrower sweep
      const childSweep = Math.min(sweep / childIds.length, Math.PI * 0.8);
      layoutLevel(cid, cx, cy, angle - childSweep / 2, childSweep, radius * 0.75);
    });
  }

  const directChildren = (childrenMap.get(rootId) || []).filter((id) => {
    const n = nodeMap.get(id);
    return !visited.has(id) && n && !n.hidden;
  });
  if (directChildren.length > 0) {
    const rootNode = nodes.find(n => n.id === rootId);
    if (rootNode) {
      const { w: rootW, h: rootH } = getNodeDimensions(rootNode);
      layoutLevel(rootId, rootW / 2, rootH / 2, -Math.PI / 2, Math.PI * 2, CONCEPT_RADIUS);
    } else {
      layoutLevel(rootId, CONCEPT_NODE_WIDTH / 2, CONCEPT_NODE_HEIGHT / 2, -Math.PI / 2, Math.PI * 2, CONCEPT_RADIUS);
    }
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

function centerPositions(positions: Map<string, { x: number; y: number }>, nodes: Node[]) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  positions.forEach((pos, id) => {
    const node = nodeMap.get(id);
    const { w, h } = node ? getNodeDimensions(node) : { w: NODE_WIDTH, h: NODE_HEIGHT };
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
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

  const trees = buildTrees(nodes, edges);
  if (trees.length === 0) return { nodes, edges };

  const allPositions = new Map<string, { x: number; y: number }>();
  const allSides = new Map<string, "left" | "right">();
  
  trees.forEach((tree) => {
    const isIndependent = !!(tree.node.data as any).isIndependent;
    const treePositions = new Map<string, { x: number; y: number }>();
    
    if (isIndependent) {
      layoutMindmapUnilateral(tree, treePositions, allSides);
      const offsetX = tree.node.position.x + (tree.node.measured?.width ?? ROOT_WIDTH) / 2;
      const offsetY = tree.node.position.y + (tree.node.measured?.height ?? ROOT_HEIGHT) / 2;
      treePositions.forEach((pos, id) => {
        allPositions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
      });
    } else {
      layoutMindmapBalanced(tree, treePositions, allSides);
      treePositions.forEach((pos, id) => {
        allPositions.set(id, pos);
      });
    }
  });

  return applyPositions(nodes, edges, allPositions, "mindmap", allSides);
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
      centerPositions(positions, nodes);
      break;
    }

    case "timeline": {
      positions = layoutTimeline(nodes, edges);
      centerPositions(positions, nodes);
      break;
    }

    case "concept_map": {
      positions = layoutConceptMap(nodes, edges);
      centerPositions(positions, nodes);
      break;
    }

    default:
      return autoLayoutMindMap(nodes, edges);
  }

  return applyPositions(nodes, edges, positions, diagramType);
}

//getNodeDimensions is now imported from diagramUtils.ts

function getMindmapHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  return targetPos.x >= sourcePos.x
    ? { sourceHandle: "right", targetHandle: "left" }
    : { sourceHandle: "left", targetHandle: "right" };
}

export function rerouteDiagramEdges(
  nodes: Node[],
  edges: Edge[],
  diagramType: string
): Edge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    if (!srcNode || !tgtNode) return edge;

    const srcPos = srcNode.position;
    const tgtPos = tgtNode.position;
    const { w: srcW, h: srcH } = getNodeDimensions(srcNode);
    const { w: tgtW, h: tgtH } = getNodeDimensions(tgtNode);

    let handles: { sourceHandle: string; targetHandle: string };

    if (diagramType === "mindmap") {
      handles = getMindmapHandles(srcPos, tgtPos);
    } else if (diagramType === "orgchart" || diagramType === "flowchart") {
      const dir = useMindMapStore.getState().layoutDirection;
      handles = dir === "RIGHT"
        ? { sourceHandle: "s-right", targetHandle: "t-left" }
        : { sourceHandle: "s-bottom", targetHandle: "t-top" };
    } else if (diagramType === "timeline") {
      handles = { sourceHandle: "right", targetHandle: "left" };
    } else {
      handles = getBestHandles(srcPos, tgtPos, srcW, srcH, tgtW, tgtH);
    }

    const { sourceHandle, targetHandle } = handles;

    const isFlowDiagram = diagramType === "orgchart" || diagramType === "flowchart";
    const edgeType = isFlowDiagram
      ? (edge.type === "sketch" ? "sketch" : "flow")
      : (edge.type || "smoothstep");

    return {
      ...edge,
      sourceHandle,
      targetHandle,
      type: edgeType,
    };
  });
}

function applyPositions(
  nodes: Node[],
  edges: Edge[],
  positions: Map<string, { x: number; y: number }>,
  diagramType: string,
  sideMap?: Map<string, "left" | "right">
): { nodes: Node[]; edges: Edge[] } {
  const newNodes = nodes.map((node) => {
    const pos = positions.get(node.id);
    const side = sideMap?.get(node.id);
    if (!pos && side === undefined) return node;
    return {
      ...node,
      ...(pos ? { position: pos } : {}),
      data: {
        ...(node.data as object),
        // Persist immutable side into data so React sees the update
        ...(side !== undefined ? { side } : {}),
      },
    };
  });

  const newEdges = rerouteDiagramEdges(newNodes, edges, diagramType);

  return { nodes: newNodes, edges: newEdges };
}
