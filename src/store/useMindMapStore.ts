import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type NodeChange, type EdgeChange } from "@xyflow/react";
import { generateThemeBranchColors } from "@/components/mindmap/depthColors";

// ─── Paleta de cores padrão ───────────────────────────────────────────────────
export const BRANCH_COLORS = [
  "#4A90E2", "#F5A623", "#9B59B6", "#E74C3C",
  "#2ECC71", "#1ABC9C", "#E67E22", "#3498DB",
];

export type NodeShape = "rounded" | "rectangle" | "oval" | "diamond";

export type MindMapNodeData = {
  label: string;
  isRoot?: boolean;
  collapsed?: boolean;
  depth?: number;
  side?: "left" | "right";
  branchIndex?: number;
  branchColor?: string;
  hasChildren?: boolean;
  isDark?: boolean;
  notes?: string;
  icon?: string;
  shape?: NodeShape;
  [key: string]: unknown;
};

export type MindMapNode = Node<MindMapNodeData>;

type ClipboardData = { nodes: MindMapNode[]; edges: Edge[] };

type MindMapStore = {
  allNodes: MindMapNode[];
  allEdges: Edge[];
  visibleNodes: MindMapNode[];
  visibleEdges: Edge[];
  collapsedIds: Set<string>;
  isLayouting: boolean;
  pendingEditNodeId: string | null;
  past: Array<{ allNodes: MindMapNode[]; allEdges: Edge[] }>;
  future: Array<{ allNodes: MindMapNode[]; allEdges: Edge[] }>;
  clipboard: ClipboardData | null;
  currentThemeEdgeColor: string | null;
  currentIsDark: boolean;
  diagramType: string;

  initDiagram: (nodes: MindMapNode[], edges: Edge[]) => void;
  setNodesAndEdges: (nodes: MindMapNode[], edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  toggleCollapse: (nodeId: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeNotes: (nodeId: string, notes: string) => void;
  updateNodeIcon: (nodeId: string, icon: string) => void;
  updateNodeShape: (nodeId: string, shape: NodeShape) => void;
  addChild: (parentId: string, label?: string) => string;
  addSibling: (nodeId: string, label?: string) => string;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  setVisible: (nodes: MindMapNode[], edges: Edge[]) => void;
  setIsLayouting: (v: boolean) => void;
  clearPendingEdit: () => void;
  undo: () => void;
  redo: () => void;
  _pushHistory: () => void;
  applyTheme: (edgeColor: string, isDark: boolean) => void;
  copySelection: (nodeIds: string[]) => void;
  pasteSelection: () => void;
  setDiagramType: (type: string) => void;
  updateEdgeData: (edgeId: string, data: Record<string, unknown>) => void;
  addSketchEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => void;
  pendingSketchSource: string | null;
  setPendingSketchSource: (id: string | null) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDescendantIds(nodeId: string, edges: Edge[]): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = edges.filter((e) => e.source === current).map((e) => e.target);
    for (const child of children) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

/**
 * Infere side, branchIndex e branchColor para toda a árvore via BFS.
 * Quando themeEdgeColor é fornecida (tema não-padrão), gera paleta derivada da cor do tema.
 */
function inferBranchSides(
  nodes: MindMapNode[],
  edges: Edge[],
  themeEdgeColor?: string | null,
  isDark?: boolean
): { nodes: MindMapNode[]; edges: Edge[] } {
  const root = nodes.find((n) => n.data.isRoot);
  if (!root) return { nodes, edges };

  // Gera paleta baseada no tema ou usa padrão
  const isDefaultColor = !themeEdgeColor || themeEdgeColor === "#a3a3a3";
  const palette: string[] = isDefaultColor
    ? BRANCH_COLORS
    : generateThemeBranchColors(themeEdgeColor!, 8);

  const nodeMap = new Map<string, MindMapNode>(nodes.map((n) => [n.id, { ...n, data: { ...n.data } }]));
  const edgeBranchColor = new Map<string, string>();

  const rootChildren = edges.filter((e) => e.source === root.id).map((e) => e.target);

  rootChildren.forEach((childId, idx) => {
    const side: "left" | "right" = idx % 2 === 0 ? "right" : "left";
    const branchIndex = idx;
    const branchColor = palette[idx % palette.length];

    const queue = [childId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = nodeMap.get(current);
      if (node) {
        nodeMap.set(current, {
          ...node,
          data: { ...node.data, side, branchIndex, branchColor, isDark: isDark ?? false },
        });
        edgeBranchColor.set(current, branchColor);
      }
      const children = edges.filter((e) => e.source === current).map((e) => e.target);
      queue.push(...children);
    }
  });

  // Root: sem side, sem branchColor, mas com isDark
  const rootNode = nodeMap.get(root.id);
  if (rootNode) {
    nodeMap.set(root.id, {
      ...rootNode,
      data: { ...rootNode.data, side: undefined, branchIndex: undefined, branchColor: undefined, isDark: isDark ?? false },
    });
  }

  const enrichedEdges = edges.map((e) => {
    const color = edgeBranchColor.get(e.target);
    const targetNode = nodeMap.get(e.target);
    const edgeSide = targetNode?.data?.side as string | undefined;
    if (!color) return e;
    return { ...e, data: { ...(e.data ?? {}), branchColor: color, side: edgeSide } };
  });

  return { nodes: Array.from(nodeMap.values()), edges: enrichedEdges };
}

function computeVisible(
  allNodes: MindMapNode[],
  allEdges: Edge[],
  collapsedIds: Set<string>
): { visibleNodes: MindMapNode[]; visibleEdges: Edge[] } {
  const hiddenIds = new Set<string>();

  for (const collapsedId of collapsedIds) {
    const descendants = getDescendantIds(collapsedId, allEdges);
    for (const id of descendants) hiddenIds.add(id);
  }

  const visibleNodes = allNodes
    .filter((n) => !hiddenIds.has(n.id))
    .map((n) => ({
      ...n,
      data: {
        ...n.data,
        collapsed: collapsedIds.has(n.id),
        hasChildren: allEdges.some((e) => e.source === n.id),
      },
    }));

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = allEdges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  return { visibleNodes, visibleEdges };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMindMapStore = create<MindMapStore>()(
  subscribeWithSelector((set, get) => ({
    allNodes: [],
    allEdges: [],
    visibleNodes: [],
    visibleEdges: [],
    collapsedIds: new Set(),
    isLayouting: false,
    pendingEditNodeId: null,
    past: [],
    future: [],
    clipboard: null,
    currentThemeEdgeColor: null,
    currentIsDark: false,
    diagramType: "mindmap",
    pendingSketchSource: null,

    _pushHistory: () => {
      const { allNodes, allEdges, past } = get();
      set({
        past: [...past.slice(-29), { allNodes: [...allNodes], allEdges: [...allEdges] }],
        future: [], // Limpa o futuro a cada nova ação
      });
    },

    undo: () => {
      const { past, future, allNodes, allEdges, collapsedIds } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const { visibleNodes, visibleEdges } = computeVisible(previous.allNodes, previous.allEdges, collapsedIds);
      set({
        allNodes: previous.allNodes,
        allEdges: previous.allEdges,
        visibleNodes,
        visibleEdges,
        past: past.slice(0, -1),
        future: [...future, { allNodes: [...allNodes], allEdges: [...allEdges] }],
        pendingEditNodeId: null,
      });
    },

    redo: () => {
      const { future, past, allNodes, allEdges, collapsedIds } = get();
      if (future.length === 0) return;
      const next = future[future.length - 1];
      const { visibleNodes, visibleEdges } = computeVisible(next.allNodes, next.allEdges, collapsedIds);
      set({
        allNodes: next.allNodes,
        allEdges: next.allEdges,
        visibleNodes,
        visibleEdges,
        future: future.slice(0, -1),
        past: [...past, { allNodes: [...allNodes], allEdges: [...allEdges] }],
        pendingEditNodeId: null,
      });
    },

    applyTheme: (edgeColor: string, isDark: boolean) => {
      const { allNodes, allEdges, collapsedIds } = get();
      const { nodes: enrichedNodes, edges: enrichedEdges } = inferBranchSides(allNodes, allEdges, edgeColor, isDark);
      const { visibleNodes, visibleEdges } = computeVisible(enrichedNodes, enrichedEdges, collapsedIds);
      set({
        allNodes: enrichedNodes,
        allEdges: enrichedEdges,
        visibleNodes,
        visibleEdges,
        currentThemeEdgeColor: edgeColor,
        currentIsDark: isDark,
      });
    },

    copySelection: (nodeIds: string[]) => {
      const { allNodes, allEdges } = get();
      if (nodeIds.length === 0) return;

      const toInclude = new Set(nodeIds);
      for (const id of nodeIds) {
        const descendants = getDescendantIds(id, allEdges);
        for (const d of descendants) toInclude.add(d);
      }

      const copiedNodes = allNodes.filter((n) => toInclude.has(n.id));
      const copiedEdges = allEdges.filter(
        (e) => toInclude.has(e.source) && toInclude.has(e.target)
      );
      set({ clipboard: { nodes: copiedNodes, edges: copiedEdges } });
    },

    pasteSelection: () => {
      const { clipboard, allNodes, allEdges, collapsedIds, currentThemeEdgeColor, currentIsDark } = get();
      if (!clipboard || clipboard.nodes.length === 0) return;

      get()._pushHistory();

      const idMap = new Map<string, string>();
      for (const node of clipboard.nodes) {
        idMap.set(node.id, `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      }

      const OFFSET = 50;
      const newNodes: MindMapNode[] = clipboard.nodes.map((n) => ({
        ...n,
        id: idMap.get(n.id)!,
        position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
        selected: true,
        data: { ...n.data, isRoot: false, isDark: currentIsDark },
      }));

      const newEdges: Edge[] = clipboard.edges.map((e) => ({
        ...e,
        id: `e-${idMap.get(e.source)}-${idMap.get(e.target)}-${Date.now()}`,
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
      }));

      const nextNodes = [...allNodes, ...newNodes];
      const nextEdges = [...allEdges, ...newEdges];
      const { nodes: enriched, edges: enrichedEdges } = inferBranchSides(nextNodes, nextEdges, currentThemeEdgeColor, currentIsDark);
      const { visibleNodes, visibleEdges } = computeVisible(enriched, enrichedEdges, collapsedIds);

      set({ allNodes: enriched, allEdges: enrichedEdges, visibleNodes, visibleEdges });
    },

    initDiagram: (nodes, edges) => {
      const { currentThemeEdgeColor, currentIsDark } = get();
      // Normalize flow edges that lack sourceHandle/targetHandle (saved before the fix)
      const normalizedEdges = edges.map((e) =>
        e.type === "flow" && !e.sourceHandle
          ? { ...e, sourceHandle: "s-bottom", targetHandle: "t-top" }
          : e
      );
      const { nodes: enrichedNodes, edges: enrichedEdges } = inferBranchSides(nodes, normalizedEdges, currentThemeEdgeColor, currentIsDark);
      const { visibleNodes, visibleEdges } = computeVisible(enrichedNodes, enrichedEdges, new Set());
      set({
        allNodes: enrichedNodes,
        allEdges: enrichedEdges,
        visibleNodes,
        visibleEdges,
        collapsedIds: new Set(),
        past: [],
        future: [],
      });
    },

    setNodesAndEdges: (nodes, edges) => {
      const { collapsedIds, currentThemeEdgeColor, currentIsDark } = get();
      const { nodes: enrichedNodes, edges: enrichedEdges } = inferBranchSides(nodes, edges, currentThemeEdgeColor, currentIsDark);
      const { visibleNodes, visibleEdges } = computeVisible(enrichedNodes, enrichedEdges, collapsedIds);
      set({ allNodes: enrichedNodes, allEdges: enrichedEdges, visibleNodes, visibleEdges });
    },

    onNodesChange: (changes) => {
      const { allNodes, visibleNodes } = get();
      const nextVisible = applyNodeChanges(changes, visibleNodes) as MindMapNode[];

      const nextAllNodes = allNodes.map((node) => {
        const visible = nextVisible.find((n) => n.id === node.id);
        if (visible) return { ...node, position: visible.position, selected: visible.selected };
        return node;
      });

      set({ visibleNodes: nextVisible, allNodes: nextAllNodes });
    },

    onEdgesChange: (changes) => {
      const { visibleEdges, allEdges, visibleNodes } = get();
      const nextVisible = applyEdgeChanges(changes, visibleEdges);

      const currentIds = new Set(nextVisible.map((e) => e.id));
      const filteredAllEdges = allEdges.filter(
        (e) =>
          currentIds.has(e.id) ||
          !visibleNodes.some((n) => n.id === e.source || n.id === e.target)
      );

      set({ visibleEdges: nextVisible, allEdges: filteredAllEdges });
    },

    toggleCollapse: (nodeId) => {
      const { allNodes, allEdges, collapsedIds } = get();
      const next = new Set(collapsedIds);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      const { visibleNodes, visibleEdges } = computeVisible(allNodes, allEdges, next);
      set({ collapsedIds: next, visibleNodes, visibleEdges });
    },

    updateNodeLabel: (nodeId, label) => {
      get()._pushHistory();
      set((state) => ({
        allNodes: state.allNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        ),
        visibleNodes: state.visibleNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        ),
      }));
    },

    updateNodeNotes: (nodeId, notes) => {
      set((state) => ({
        allNodes: state.allNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, notes } } : n
        ),
        visibleNodes: state.visibleNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, notes } } : n
        ),
      }));
    },

    updateNodeIcon: (nodeId, icon) => {
      set((state) => ({
        allNodes: state.allNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, icon } } : n
        ),
        visibleNodes: state.visibleNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, icon } } : n
        ),
      }));
    },

    updateNodeShape: (nodeId, shape) => {
      set((state) => ({
        allNodes: state.allNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, shape } } : n
        ),
        visibleNodes: state.visibleNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, shape } } : n
        ),
      }));
    },

    updateNodePosition: (nodeId, position) => {
      set((state) => ({
        allNodes: state.allNodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
        visibleNodes: state.visibleNodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }));
    },

    addChild: (parentId, label = "Novo tópico") => {
      get()._pushHistory();
      const { allNodes, allEdges, collapsedIds, currentThemeEdgeColor, currentIsDark, diagramType } = get();
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const parentNode = allNodes.find((n) => n.id === parentId);
      const parentDepth = parentNode?.data?.depth ?? 0;

      const isFlowDiagram = diagramType === "orgchart" || diagramType === "flowchart";

      const isDefaultColor = !currentThemeEdgeColor || currentThemeEdgeColor === "#a3a3a3";
      const palette = isDefaultColor ? BRANCH_COLORS : generateThemeBranchColors(currentThemeEdgeColor!, 8);

      let side: "left" | "right" = "right";
      let branchIndex = 0;
      let branchColor = palette[0];

      if (isFlowDiagram) {
        // Sem divisão esquerda/direita — herda cor do pai ou atribui pela posição
        if (parentDepth === 0) {
          const idx = allEdges.filter((e) => e.source === parentId).length;
          branchIndex = idx;
          branchColor = palette[idx % palette.length];
        } else {
          branchIndex = (parentNode?.data?.branchIndex as number) ?? 0;
          branchColor = (parentNode?.data?.branchColor as string) ?? palette[0];
        }
      } else {
        // Mindmap: alterna esquerda/direita nos filhos da raiz
        if (parentDepth === 0) {
          const existingRootChildren = allEdges.filter((e) => e.source === parentId);
          const idx = existingRootChildren.length;
          side = idx % 2 === 0 ? "right" : "left";
          branchIndex = idx;
          branchColor = palette[idx % palette.length];
        } else {
          side = (parentNode?.data?.side as "left" | "right") ?? "right";
          branchIndex = (parentNode?.data?.branchIndex as number) ?? 0;
          branchColor = (parentNode?.data?.branchColor as string) ?? palette[0];
        }
      }

      const parentPos = parentNode?.position ?? { x: 0, y: 0 };
      const parentW = (parentNode as any)?.measured?.width ?? 150;
      const parentH = (parentNode as any)?.measured?.height ?? 40;

      // Para flow: posiciona abaixo. Para mindmap: posiciona à direita/esquerda.
      const initialX = isFlowDiagram ? parentPos.x : (side === "right" ? parentPos.x + parentW + 40 : parentPos.x - 190);
      const initialY = isFlowDiagram ? parentPos.y + parentH + 80 : parentPos.y;

      const newNode: MindMapNode = {
        id: newId,
        type: "mindmap",
        position: { x: initialX, y: initialY },
        data: {
          label,
          depth: parentDepth + 1,
          side: isFlowDiagram ? undefined : side,
          branchIndex,
          branchColor,
          isDark: currentIsDark,
          // Flowchart herda retângulo como padrão; orgchart também
          shape: isFlowDiagram ? "rectangle" : undefined,
        },
      };

      const newEdge: Edge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: isFlowDiagram ? "flow" : "mindmap",
        ...(isFlowDiagram ? { sourceHandle: "s-bottom", targetHandle: "t-top" } : {}),
        data: { branchColor, side: isFlowDiagram ? undefined : side },
      };

      const nextCollapsed = new Set(collapsedIds);
      nextCollapsed.delete(parentId);

      const nextNodes = [...allNodes, newNode];
      const nextEdges = [...allEdges, newEdge];
      const { visibleNodes, visibleEdges } = computeVisible(nextNodes, nextEdges, nextCollapsed);

      set({
        allNodes: nextNodes,
        allEdges: nextEdges,
        visibleNodes,
        visibleEdges,
        collapsedIds: nextCollapsed,
        pendingEditNodeId: newId,
      });

      return newId;
    },

    addSibling: (nodeId, label = "Novo tópico") => {
      const { allEdges } = get();
      // Busca o pai independente do tipo de aresta (mindmap ou flow)
      const parentEdge = allEdges.find((e) => e.target === nodeId);
      const parentId = parentEdge?.source;

      if (!parentId) return get().addChild(nodeId, label);
      return get().addChild(parentId, label);
    },

    clearPendingEdit: () => set({ pendingEditNodeId: null }),

    deleteNode: (nodeId) => {
      get()._pushHistory();
      const { allNodes, allEdges, collapsedIds } = get();
      const toDelete = new Set([nodeId, ...getDescendantIds(nodeId, allEdges)]);
      const nextNodes = allNodes.filter((n) => !toDelete.has(n.id));
      const nextEdges = allEdges.filter(
        (e) => !toDelete.has(e.source) && !toDelete.has(e.target)
      );
      const nextCollapsed = new Set([...collapsedIds].filter((id) => !toDelete.has(id)));
      const { visibleNodes, visibleEdges } = computeVisible(nextNodes, nextEdges, nextCollapsed);
      set({ allNodes: nextNodes, allEdges: nextEdges, visibleNodes, visibleEdges, collapsedIds: nextCollapsed });
    },

    deleteNodes: (nodeIds) => {
      if (nodeIds.length === 0) return;
      get()._pushHistory();
      const { allNodes, allEdges, collapsedIds } = get();
      const toDelete = new Set<string>();
      for (const id of nodeIds) {
        toDelete.add(id);
        const descendants = getDescendantIds(id, allEdges);
        for (const d of descendants) toDelete.add(d);
      }
      const nextNodes = allNodes.filter((n) => !toDelete.has(n.id));
      const nextEdges = allEdges.filter(
        (e) => !toDelete.has(e.source) && !toDelete.has(e.target)
      );
      const nextCollapsed = new Set([...collapsedIds].filter((id) => !toDelete.has(id)));
      const { visibleNodes, visibleEdges } = computeVisible(nextNodes, nextEdges, nextCollapsed);
      set({ allNodes: nextNodes, allEdges: nextEdges, visibleNodes, visibleEdges, collapsedIds: nextCollapsed });
    },

    setVisible: (nodes, edges) => set({ visibleNodes: nodes, visibleEdges: edges }),
    setIsLayouting: (v) => set({ isLayouting: v }),
    setDiagramType: (type) => set({ diagramType: type }),
    setPendingSketchSource: (id) => set({ pendingSketchSource: id }),

    updateEdgeData: (edgeId, data) => {
      set((state) => ({
        allEdges: state.allEdges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...(e.data ?? {}), ...data } } : e
        ),
        visibleEdges: state.visibleEdges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...(e.data ?? {}), ...data } } : e
        ),
      }));
    },

    addSketchEdge: (source, target, sourceHandle, targetHandle) => {
      const newEdge: Edge = {
        id: `sketch-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source,
        target,
        ...(sourceHandle ? { sourceHandle } : {}),
        ...(targetHandle ? { targetHandle } : {}),
        type: "sketch",
        data: { color: "#22c55e", lineType: "dashed", markerEnd: "open-arrow", markerStart: "none" },
      };
      set((state) => ({
        allEdges: [...state.allEdges, newEdge],
        visibleEdges: [...state.visibleEdges, newEdge],
      }));
    },
  }))
);
