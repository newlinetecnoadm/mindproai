import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type NodeChange, type EdgeChange } from "@xyflow/react";

// ─── Paleta de cores dos branches ──────────────────────────────────────────────
export const BRANCH_COLORS = [
  "#4A90E2", // azul
  "#F5A623", // laranja
  "#9B59B6", // roxo
  "#E74C3C", // vermelho
  "#2ECC71", // verde
  "#1ABC9C", // turquesa
  "#E67E22", // laranja escuro
  "#3498DB", // azul claro
];

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
  [key: string]: unknown;
};

export type MindMapNode = Node<MindMapNodeData>;

type MindMapStore = {
  allNodes: MindMapNode[];
  allEdges: Edge[];
  visibleNodes: MindMapNode[];
  visibleEdges: Edge[];
  collapsedIds: Set<string>;
  isLayouting: boolean;
  pendingEditNodeId: string | null;
  past: Array<{ allNodes: MindMapNode[]; allEdges: Edge[] }>; // pilha de undo

  initDiagram: (nodes: MindMapNode[], edges: Edge[]) => void;
  setNodesAndEdges: (nodes: MindMapNode[], edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  toggleCollapse: (nodeId: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addChild: (parentId: string, label?: string) => string;
  addSibling: (nodeId: string, label?: string) => string;
  deleteNode: (nodeId: string) => void;
  setVisible: (nodes: MindMapNode[], edges: Edge[]) => void;
  setIsLayouting: (v: boolean) => void;
  clearPendingEdit: () => void;
  undo: () => void;
  _pushHistory: () => void;
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
 * Infere `side`, `branchIndex` e `branchColor` para toda a árvore via BFS a partir da raiz.
 * Filhos diretos da raiz alternam: 0=right, 1=left, 2=right...
 * Sub-nós herdam o lado do primeiro ancestral com side definido.
 * Também enriquece as edges com a branchColor correspondente.
 */
function inferBranchSides(
  nodes: MindMapNode[],
  edges: Edge[]
): { nodes: MindMapNode[]; edges: Edge[] } {
  const root = nodes.find((n) => n.data.isRoot);
  if (!root) return { nodes, edges };

  const nodeMap = new Map<string, MindMapNode>(nodes.map((n) => [n.id, { ...n, data: { ...n.data } }]));
  // branchColor por edge source
  const edgeBranchColor = new Map<string, string>();

  const rootChildren = edges.filter((e) => e.source === root.id).map((e) => e.target);

  rootChildren.forEach((childId, idx) => {
    const side: "left" | "right" = idx % 2 === 0 ? "right" : "left";
    const branchIndex = idx;
    const branchColor = BRANCH_COLORS[idx % BRANCH_COLORS.length];

    // BFS — propagar side/branchIndex/branchColor para toda a sub-árvore
    const queue = [childId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = nodeMap.get(current);
      if (node) {
        nodeMap.set(current, {
          ...node,
          data: { ...node.data, side, branchIndex, branchColor },
        });
        edgeBranchColor.set(current, branchColor);
      }
      const children = edges.filter((e) => e.source === current).map((e) => e.target);
      queue.push(...children);
    }
  });

  // Raiz sem side
  const rootNode = nodeMap.get(root.id);
  if (rootNode) {
    nodeMap.set(root.id, {
      ...rootNode,
      data: { ...rootNode.data, side: undefined, branchIndex: undefined, branchColor: undefined },
    });
  }

  // Enriquecer edges com branchColor E side na data
  // Ambos são lidos pelo MindMapEdge para determinar o ponto fixo de saída
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

    _pushHistory: () => {
      const { allNodes, allEdges, past } = get();
      // Mantém até 30 estados na pilha
      set({ past: [...past.slice(-29), { allNodes: [...allNodes], allEdges: [...allEdges] }] });
    },

    undo: () => {
      const { past, collapsedIds } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const { visibleNodes, visibleEdges } = computeVisible(
        previous.allNodes,
        previous.allEdges,
        collapsedIds
      );
      set({
        allNodes: previous.allNodes,
        allEdges: previous.allEdges,
        visibleNodes,
        visibleEdges,
        past: past.slice(0, -1),
        pendingEditNodeId: null,
      });
    },

    initDiagram: (nodes, edges) => {
      const { nodes: enrichedNodes, edges: enrichedEdges } = inferBranchSides(nodes, edges);
      const { visibleNodes, visibleEdges } = computeVisible(enrichedNodes, enrichedEdges, new Set());
      set({
        allNodes: enrichedNodes,
        allEdges: enrichedEdges,
        visibleNodes,
        visibleEdges,
        collapsedIds: new Set(),
      });
    },

    setNodesAndEdges: (nodes, edges) => {
      const { collapsedIds } = get();
      const { nodes: enrichedNodes, edges: enrichedEdges } = inferBranchSides(nodes, edges);
      const { visibleNodes, visibleEdges } = computeVisible(enrichedNodes, enrichedEdges, collapsedIds);
      set({ allNodes: enrichedNodes, allEdges: enrichedEdges, visibleNodes, visibleEdges });
    },

    onNodesChange: (changes) => {
      const { allNodes, visibleNodes, allEdges, collapsedIds } = get();
      const nextVisible = applyNodeChanges(changes, visibleNodes) as MindMapNode[];

      // Sync posições e seleção de volta para allNodes
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
      get()._pushHistory(); // salva antes de editar
      set((state) => ({
        allNodes: state.allNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        ),
        visibleNodes: state.visibleNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
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
      get()._pushHistory(); // salva antes de adicionar
      const { allNodes, allEdges, collapsedIds } = get();
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const parentNode = allNodes.find((n) => n.id === parentId);
      const parentDepth = parentNode?.data?.depth ?? 0;

      let side: "left" | "right" = "right";
      let branchIndex = 0;
      let branchColor = BRANCH_COLORS[0];

      if (parentDepth === 0) {
        const existingRootChildren = allEdges.filter((e) => e.source === parentId);
        const idx = existingRootChildren.length;
        side = idx % 2 === 0 ? "right" : "left";
        branchIndex = idx;
        branchColor = BRANCH_COLORS[idx % BRANCH_COLORS.length];
      } else {
        side = (parentNode?.data?.side as "left" | "right") ?? "right";
        branchIndex = parentNode?.data?.branchIndex ?? 0;
        branchColor = (parentNode?.data?.branchColor as string) ?? BRANCH_COLORS[0];
      }

      // Posição inicial = ao lado do pai no sentido correto
      // ELK vai reposicionar corretamente, mas o nó já começa perto do destino → sem flash
      const parentPos = parentNode?.position ?? { x: 0, y: 0 };
      const parentW = (parentNode as any)?.measured?.width ?? 150;
      const initialX = side === "right"
        ? parentPos.x + parentW + 40
        : parentPos.x - 190;
      const initialY = parentPos.y;

      const newNode: MindMapNode = {
        id: newId,
        type: "mindmap",
        position: { x: initialX, y: initialY },
        data: { label, depth: parentDepth + 1, side, branchIndex, branchColor },
      };

      const newEdge: Edge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: "mindmap",
        // side e branchColor na edge para que o MindMapEdge determine o ponto de saída correto
        data: { branchColor, side },
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
        pendingEditNodeId: newId, // Sinaliza para auto-edit
      });

      return newId;
    },

    addSibling: (nodeId, label = "Novo tópico") => {
      const { allEdges, allNodes } = get();
      // Encontra o pai do nó atual
      const parentEdge = allEdges.find((e) => e.target === nodeId && e.type === "mindmap");
      const parentId = parentEdge?.source;

      if (!parentId) {
        // Nó raiz: adiciona filho da raiz
        return get().addChild(nodeId, label);
      }

      return get().addChild(parentId, label);
    },

    clearPendingEdit: () => set({ pendingEditNodeId: null }),

    deleteNode: (nodeId) => {
      get()._pushHistory(); // salva antes de deletar
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

    setVisible: (nodes, edges) => set({ visibleNodes: nodes, visibleEdges: edges }),
    setIsLayouting: (v) => set({ isLayouting: v }),
  }))
);
