import { useCallback, useEffect, useRef } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useReactFlow, useNodesInitialized } from "@xyflow/react";
import { useMindMapStore } from "@/store/useMindMapStore";

// Singleton ELK — usado apenas para orgchart/flowchart
const elk = new ELK();

function elkOptionsDown() {
  return {
    "elk.algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    "elk.spacing.nodeNode": "40",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "SPLINES",
    "elk.padding": "[top=40, left=60, bottom=40, right=60]",
  };
}

// ── Custom mind-map tree layout (MindMeister-style) ───────────────────────────
//
// Root position is FIXED — children fan out horizontally and center vertically
// around the parent, exactly like MindMeister. No fitView on structural changes
// (only on first render), so the canvas stays stable as you add nodes.

const LAYER_SPACING_L0 = 110;  // root → direct children
const LAYER_SPACING_LN = 70;   // deeper levels
const NODE_GAP         = 34;   // vertical gap between sibling subtrees
const DEFAULT_W     = 120;
const DEFAULT_H     = 36;

type Size = { width: number; height: number };
type Pos  = { x: number; y: number };

/** Build a parent→children map, restricted to a set of node IDs. */
function buildChildMap(
  edges: { source: string; target: string; type?: string }[],
  nodeIds: Set<string>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type === "sketch") continue;
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    if (!map.has(e.source)) map.set(e.source, []);
    map.get(e.source)!.push(e.target);
  }
  return map;
}

/**
 * Total vertical space required by a node's entire subtree.
 * If the node has no children, it's just the node's own height.
 * Otherwise it's the sum of all children's subtree heights + gaps between them
 * (with the node's own height as a minimum).
 */
function subtreeHeight(
  id: string,
  childMap: Map<string, string[]>,
  sizes: Map<string, Size>
): number {
  const h = sizes.get(id)?.height ?? DEFAULT_H;
  const children = childMap.get(id) ?? [];
  if (children.length === 0) return h;

  const childTotal =
    children.reduce((s, c) => s + subtreeHeight(c, childMap, sizes), 0) +
    Math.max(0, children.length - 1) * NODE_GAP;

  return Math.max(h, childTotal);
}

/**
 * Recursively assign positions.
 *
 * - `id`      : current node
 * - `x`       : left edge of this node
 * - `centerY` : vertical center this node should align to
 * - `dir`     : "right" → children go to the right; "left" → children go to the left
 * - `depth`   : 0 = root, 1 = direct children, etc.
 */
function assignPositions(
  id: string,
  x: number,
  centerY: number,
  dir: "right" | "left",
  childMap: Map<string, string[]>,
  sizes: Map<string, Size>,
  positions: Map<string, Pos>,
  depth = 0
): void {
  const { width: w, height: h } = sizes.get(id) ?? { width: DEFAULT_W, height: DEFAULT_H };
  positions.set(id, { x, y: centerY - h / 2 });

  const children = childMap.get(id) ?? [];
  if (children.length === 0) return;

  const childH = children.map((c) => subtreeHeight(c, childMap, sizes));
  const totalH =
    childH.reduce((s, v) => s + v, 0) + Math.max(0, children.length - 1) * NODE_GAP;

  const spacing = depth === 0 ? LAYER_SPACING_L0 : LAYER_SPACING_LN;

  let curY = centerY - totalH / 2;
  for (let i = 0; i < children.length; i++) {
    const cid = children[i];
    const cw = sizes.get(cid)?.width ?? DEFAULT_W;
    // Children x: move one layer away from parent
    const nextX = dir === "right" ? x + w + spacing : x - spacing - cw;
    assignPositions(cid, nextX, curY + childH[i] / 2, dir, childMap, sizes, positions, depth + 1);
    curY += childH[i] + NODE_GAP;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useElkLayout() {
  const { getNodes, setNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const visibleEdges = useMindMapStore((s) => s.visibleEdges);
  const visibleNodes = useMindMapStore((s) => s.visibleNodes);
  const diagramType  = useMindMapStore((s) => s.diagramType);

  const isRunning  = useRef(false);
  // After the first successful layout we stop calling fitView
  const didInitFit = useRef(false);

  const structuralEdgeCount = visibleEdges.filter((e) => e.type !== "sketch").length;
  const structureKey = `${visibleNodes.length}|${structuralEdgeCount}|${
    useMindMapStore.getState().collapsedIds.size
  }`;

  const runLayout = useCallback(async () => {
    const nodes = getNodes();
    if (isRunning.current || nodes.length === 0) return;
    isRunning.current = true;

    try {
      // ── Orgchart / Flowchart: ELK DOWN layout ──────────────────────────────
      if (diagramType === "orgchart" || diagramType === "flowchart") {
        const layoutEdges = visibleEdges.filter((e) => e.type !== "sketch");
        const graph = {
          id: "down",
          layoutOptions: elkOptionsDown(),
          children: nodes.map((n) => ({
            id: n.id,
            width: (n as any).measured?.width ?? DEFAULT_W,
            height: (n as any).measured?.height ?? DEFAULT_H,
          })),
          edges: layoutEdges.map((e) => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
          })),
        };
        const result = await elk.layout(graph);
        const posMap = new Map<string, Pos>();
        result.children?.forEach((n) => posMap.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 }));
        setNodes(nodes.map((n) => {
          const p = posMap.get(n.id);
          return p ? { ...n, position: p } : n;
        }));
        if (!didInitFit.current) {
          didInitFit.current = true;
          setTimeout(() => fitView({ duration: 500, padding: 0.15 }), 80);
        }
        return;
      }

      // ── Mind Map: custom stable tree layout ────────────────────────────────
      const root = nodes.find((n) => (n.data as any).isRoot);
      if (!root) return;

      // Measure each node (use ReactFlow's measured dimensions when available)
      const sizes = new Map<string, Size>();
      for (const n of nodes) {
        sizes.set(n.id, {
          width:  (n as any).measured?.width  ?? DEFAULT_W,
          height: (n as any).measured?.height ?? DEFAULT_H,
        });
      }

      // Root center stays where the root currently is — this is the "anchor"
      const rootW       = sizes.get(root.id)?.width  ?? DEFAULT_W;
      const rootH       = sizes.get(root.id)?.height ?? DEFAULT_H;
      const rootCenterX = root.position.x + rootW / 2;
      const rootCenterY = root.position.y + rootH / 2;

      // Partition nodes by side
      const rightNodeIds = new Set(
        nodes
          .filter((n) => n.id === root.id || (n.data as any).side === "right")
          .map((n) => n.id)
      );
      const leftNodeIds = new Set(
        nodes
          .filter((n) => n.id === root.id || (n.data as any).side === "left")
          .map((n) => n.id)
      );

      const structEdges = visibleEdges.filter((e) => e.type !== "sketch");
      const rightChildMap = buildChildMap(structEdges, rightNodeIds);
      const leftChildMap  = buildChildMap(structEdges, leftNodeIds);

      const positions = new Map<string, Pos>();

      // Root: keep its left edge pinned to rootCenterX - rootW/2
      const rootX = rootCenterX - rootW / 2;

      // Right side
      assignPositions(root.id, rootX, rootCenterY, "right", rightChildMap, sizes, positions);

      // Left side (skip root position — already set above)
      if (leftNodeIds.size > 1) {
        const leftPositions = new Map<string, Pos>();
        assignPositions(root.id, rootX, rootCenterY, "left", leftChildMap, sizes, leftPositions);
        for (const [id, pos] of leftPositions) {
          if (id !== root.id) positions.set(id, pos);
        }
      }

      setNodes(nodes.map((n) => {
        const p = positions.get(n.id);
        return p ? { ...n, position: p } : n;
      }));

      // fitView only once — on initial render — not on every structural change
      if (!didInitFit.current) {
        didInitFit.current = true;
        setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 100);
      }
    } catch (err) {
      console.error("[TreeLayout]", err);
    } finally {
      isRunning.current = false;
    }
  }, [getNodes, setNodes, fitView, visibleEdges, diagramType]);

  useEffect(() => {
    if (nodesInitialized) runLayout();
    // structureKey triggers re-layout when nodes/edges change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, structureKey]);

  return { runLayout };
}
