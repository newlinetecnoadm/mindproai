import type { Node, Edge } from "@xyflow/react";
import type { MindMapNodeData } from "@/store/useMindMapStore";

// Simple tree layout algorithm
interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
  height: number;
  x: number;
  y: number;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const H_GAP = 60;
const V_GAP = 20;

function buildTree(nodes: Node[], edges: Edge[], rootId: string): TreeNode | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  for (const edge of edges) {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  function build(id: string): TreeNode | null {
    const node = nodeMap.get(id);
    if (!node) return null;
    const childIds = childrenMap.get(id) || [];
    const children = childIds.map(build).filter(Boolean) as TreeNode[];
    return { id, children, width: NODE_WIDTH, height: NODE_HEIGHT, x: 0, y: 0 };
  }

  return build(rootId);
}

function layoutTree(tree: TreeNode, x: number, y: number): void {
  tree.x = x;
  tree.y = y;

  if (tree.children.length === 0) return;

  const totalHeight = tree.children.reduce((sum, c) => sum + getSubtreeHeight(c), 0) + (tree.children.length - 1) * V_GAP;
  let currentY = y - totalHeight / 2 + getSubtreeHeight(tree.children[0]) / 2;

  for (const child of tree.children) {
    layoutTree(child, x + NODE_WIDTH + H_GAP, currentY);
    currentY += getSubtreeHeight(child) + V_GAP;
  }
}

function getSubtreeHeight(tree: TreeNode): number {
  if (tree.children.length === 0) return tree.height;
  const childrenHeight = tree.children.reduce((sum, c) => sum + getSubtreeHeight(c), 0) + (tree.children.length - 1) * V_GAP;
  return Math.max(tree.height, childrenHeight);
}

function flattenTree(tree: TreeNode): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  function flatten(node: TreeNode) {
    result.set(node.id, { x: node.x, y: node.y });
    node.children.forEach(flatten);
  }
  flatten(tree);
  return result;
}

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const rootNode = nodes.find((n) => (n.data as MindMapNodeData).isRoot);
  if (!rootNode) return nodes;

  const tree = buildTree(nodes, edges, rootNode.id);
  if (!tree) return nodes;

  layoutTree(tree, 0, 0);
  const positions = flattenTree(tree);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: { x: pos.x, y: pos.y } } : node;
  });
}

let idCounter = 0;
export function generateNodeId(): string {
  return `node_${Date.now()}_${idCounter++}`;
}

export function createInitialNodes(): { nodes: Node[]; edges: Edge[] } {
  const rootId = generateNodeId();
  const child1Id = generateNodeId();
  const child2Id = generateNodeId();
  const child3Id = generateNodeId();

  const nodes: Node[] = [
    { id: rootId, type: "mindmap", position: { x: 0, y: 0 }, data: { label: "Ideia Central", isRoot: true, color: "orange" } },
    { id: child1Id, type: "mindmap", position: { x: 250, y: -60 }, data: { label: "Tópico 1", color: "blue" } },
    { id: child2Id, type: "mindmap", position: { x: 250, y: 0 }, data: { label: "Tópico 2", color: "green" } },
    { id: child3Id, type: "mindmap", position: { x: 250, y: 60 }, data: { label: "Tópico 3", color: "purple" } },
  ];

  const edges: Edge[] = [
    { id: `e-${rootId}-${child1Id}`, source: rootId, target: child1Id, type: "smoothstep" },
    { id: `e-${rootId}-${child2Id}`, source: rootId, target: child2Id, type: "smoothstep" },
    { id: `e-${rootId}-${child3Id}`, source: rootId, target: child3Id, type: "smoothstep" },
  ];

  const laid = autoLayout(nodes, edges);
  return { nodes: laid, edges };
}
