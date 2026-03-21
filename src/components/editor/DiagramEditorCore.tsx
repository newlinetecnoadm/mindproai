import { useCallback, useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import { autoLayoutDiagram } from "@/components/mindmap/mindmapLayout";
import { getNodeDepth, getColorForDepth, assignDepthColors } from "@/components/mindmap/depthColors";
import { toggleNodeCollapse, getVisibleGraph } from "@/lib/diagramUtils";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import { useAutoLayout } from "@/hooks/useAutoLayout";
import { buildNodeStyle, inferStyleKey, getNodeStyle } from "@/lib/nodeStyles";
import "@xyflow/react/dist/style.css";
import MindMapNode from "@/components/mindmap/MindMapNode";
import FlowchartNode from "./nodes/FlowchartNode";
import OrgNode from "./nodes/OrgNode";
import TimelineNode from "./nodes/TimelineNode";
import ConceptNode from "./nodes/ConceptNode";
import DiamondNode from "./nodes/DiamondNode";
import StickyNoteNode from "./nodes/StickyNoteNode";
import { CurvedEdge, OrthogonalEdge, StraightEdge, HierarchyEdge, AnimatedSmoothStepEdge } from "./edges/CustomEdges";
import EditorToolbar from "./EditorToolbar";
import NodeFloatingToolbar from "./NodeFloatingToolbar";
import NodeSearchBar from "./NodeSearchBar";
import AIMapAssistDialog from "./AIMapAssistDialog";
import NodeContextMenu from "./NodeContextMenu";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { editorThemes, isColorDark, type EditorTheme } from "./editorThemes";

/** Derive UI chrome colors from a theme (bg + edge only) */
function themeUI(t: EditorTheme) {
  const dark = isColorDark(t.bg);
  return {
    cardBg: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)",
    cardBorder: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    cardText: dark ? "#e2e8f0" : "#1f1f1f",
    minimapNode: t.edgeColor,
    accentColor: t.edgeColor,
  };
}

const nodeTypes = {
  mindmap: MindMapNode as any,
  flowchart: FlowchartNode as any,
  org: OrgNode as any,
  timeline: TimelineNode as any,
  concept: ConceptNode as any,
  diamond: DiamondNode as any,
  sticky: StickyNoteNode as any,
};

const edgeTypes = {
  smoothstep: AnimatedSmoothStepEdge as any,
  curved: CurvedEdge as any,
  orthogonal: OrthogonalEdge as any,
  straight: StraightEdge as any,
  hierarchy: HierarchyEdge as any,
};

const childColors = ["blue", "green", "purple", "red", "yellow", "orange"];

const typeToNodeType: Record<string, string> = {
  mindmap: "mindmap",
  flowchart: "flowchart",
  orgchart: "org",
  timeline: "timeline",
  concept_map: "concept",
  swimlane: "flowchart",
  wireframe: "flowchart",
};

interface DiagramEditorCoreProps {
  diagramType: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialThemeId?: string;
  onSave: (nodes: Node[], edges: Edge[], themeId: string, thumbnailDataUrl?: string) => Promise<void>;
  saving: boolean;
  remoteNodes?: Node[];
  remoteEdges?: Edge[];
  remoteThemeId?: string;
}

const PROXIMITY_THRESHOLD = 120; // px — distance to trigger reparent on drag

function DiagramEditorInner({ diagramType, initialNodes, initialEdges, initialThemeId, onSave, saving, remoteNodes, remoteEdges, remoteThemeId }: DiagramEditorCoreProps) {
  // Drag state: which node is being dragged + its descendants
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingDescendantIds, setDraggingDescendantIds] = useState<Set<string>>(new Set());
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const { triggerLayout } = useAutoLayout(diagramType);
  const getInitialLayout = () => {
    let n = initialNodes || [];
    const e = initialEdges || [];
    if (n.length > 0) {
      if (["mindmap", "orgchart", "concept_map"].includes(diagramType)) {
        n = assignDepthColors(n, e);
      }
      // initialLayout is skipped, relying on useAutoLayout hooked to component render
      return { nodes: n, edges: e };
    }
    return { nodes: n, edges: e };
  };
  const initialData = getInitialLayout();
  const [nodes, setNodes, onNodesChangeCore] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const [exporting, setExporting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const limits = usePlanLimits();
  const [theme, setTheme] = useState<EditorTheme>(
    editorThemes.find((t) => t.id === initialThemeId) || editorThemes[0]
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentEdgeType, setCurrentEdgeType] = useState("smoothstep");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: Node } | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChanges = useRef(false);
  const lastPersistedSnapshot = useRef<string | null>(null);
  const remoteUpdateRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const initialFitDone = useRef(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const layoutTimeoutRef = useRef<NodeJS.Timeout>();

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChangeCore>[0]) => {
      onNodesChangeCore(changes);
      
      // Look for dimension changes that aren't resizing
      const hasDimensionChange = changes.some(
        (c) => c.type === 'dimensions' && c.resizing !== true
      );
      
      if (hasDimensionChange) {
        if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = setTimeout(() => {
          triggerLayout();
        }, 150);
      }
    },
    [onNodesChangeCore, triggerLayout]
  );

  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

  const buildContentSnapshot = useCallback((snapshotNodes: Node[], snapshotEdges: Edge[], themeId: string) => {
    const round = (value: number) => Math.round(value * 100) / 100;

    const normalizedNodes = snapshotNodes
      .map((node) => ({
        id: node.id,
        type: node.type,
        position: {
          x: round(node.position.x),
          y: round(node.position.y),
        },
        data: node.data,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const normalizedEdges = snapshotEdges
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || "smoothstep",
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
        label: edge.label || null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
      themeId,
      nodes: normalizedNodes,
      edges: normalizedEdges,
    });
  }, []);

  // Capture thumbnail from the ReactFlow viewport
  const captureThumbnail = useCallback(async (): Promise<string | undefined> => {
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return undefined;
    try {
      const dataUrl = await toPng(el, { width: 400, height: 240, quality: 0.7, pixelRatio: 1 });
      return dataUrl;
    } catch {
      return undefined;
    }
  }, []);

  // Autosave: only when content actually changed
  useEffect(() => {
    const currentSnapshot = buildContentSnapshot(nodes, edges, theme.id);

    if (lastPersistedSnapshot.current === null) {
      lastPersistedSnapshot.current = currentSnapshot;
      return;
    }

    if (remoteUpdateRef.current) {
      lastPersistedSnapshot.current = currentSnapshot;
      pendingChanges.current = false;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      return;
    }

    if (currentSnapshot === lastPersistedSnapshot.current) {
      pendingChanges.current = false;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      return;
    }

    pendingChanges.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      if (!pendingChanges.current) return;

      const latestNodes = nodesRef.current;
      const latestEdges = edgesRef.current;
      const snapshotBeforeSave = buildContentSnapshot(latestNodes, latestEdges, theme.id);
      if (snapshotBeforeSave === lastPersistedSnapshot.current) {
        pendingChanges.current = false;
        return;
      }

      try {
        const thumb = await captureThumbnail();
        await onSaveRef.current(latestNodes, latestEdges, theme.id, thumb);
        setLastSavedAt(new Date());
        lastPersistedSnapshot.current = snapshotBeforeSave;
        pendingChanges.current = false;
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }, 10000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [nodes, edges, theme.id, captureThumbnail, buildContentSnapshot]);

  // Apply remote updates from other users
  useEffect(() => {
    if (remoteNodes && remoteNodes.length > 0) {
      remoteUpdateRef.current = true;
      const nextRemoteEdges = remoteEdges || [];
      const nextThemeId = remoteThemeId || theme.id;

      setNodes(remoteNodes);
      setEdges(nextRemoteEdges);
      lastPersistedSnapshot.current = buildContentSnapshot(remoteNodes, nextRemoteEdges, nextThemeId);

      if (remoteThemeId) {
        const newTheme = editorThemes.find((t) => t.id === remoteThemeId);
        if (newTheme) setTheme(newTheme);
      }

      // Reset flag after React processes the state update
      requestAnimationFrame(() => {
        remoteUpdateRef.current = false;
      });
    }
  }, [remoteNodes, remoteEdges, remoteThemeId, theme.id, setNodes, setEdges, buildContentSnapshot]);

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, type: currentEdgeType }, eds));
    },
    [setEdges, takeSnapshot, currentEdgeType]
  );

  const selectedNodes = nodes.filter((n) => n.selected);
  const nodeType = typeToNodeType[diagramType] || "mindmap";

  // Auto-layout helper — always enforces standardized structure
  const applyAutoLayout = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    const laid = autoLayoutDiagram(nextNodes, nextEdges, diagramType);
    setNodes(laid.nodes);
    setEdges(laid.edges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [diagramType, setNodes, setEdges, fitView]);

  // Re-layout all nodes
  const handleReLayout = useCallback(() => {
    takeSnapshot();
    const { visibleNodes, visibleEdges } = getVisibleGraph(nodesRef.current, edgesRef.current);
    setNodes(visibleNodes);
    setEdges(visibleEdges);
    triggerLayout();
  }, [triggerLayout, takeSnapshot, setNodes, setEdges]);

  // Handle collapse/expand toggle dispatched from node buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (!nodeId) return;
      takeSnapshot();
      
      const toggledNodes = toggleNodeCollapse(nodeId, nodesRef.current);
      const { visibleNodes, visibleEdges } = getVisibleGraph(toggledNodes, edgesRef.current);
      
      setNodes(visibleNodes);
      setEdges(visibleEdges);
      triggerLayout();
    };
    window.addEventListener("mindmap-toggle-collapse", handler);
    return () => window.removeEventListener("mindmap-toggle-collapse", handler);
  }, [setNodes, setEdges, triggerLayout, takeSnapshot]);

  // Collect descendants of a node
  const collectDescendantIds = useCallback((nodeId: string, edgeList: Edge[]): Set<string> => {
    const ids = new Set<string>();
    function walk(parentId: string) {
      for (const e of edgeList) {
        if (e.source === parentId && !ids.has(e.target)) {
          ids.add(e.target);
          walk(e.target);
        }
      }
    }
    walk(nodeId);
    return ids;
  }, []);

  // Drag start: record which node + subtree is being dragged
  const handleNodeDragStart = useCallback((_event: any, draggedNode: Node) => {
    if ((draggedNode.data as any).isRoot) return;
    const descIds = collectDescendantIds(draggedNode.id, edges);
    setDraggingNodeId(draggedNode.id);
    setDraggingDescendantIds(descIds);
    setDropTargetId(null);
  }, [edges, collectDescendantIds]);

  // Drag move: find closest candidate to highlight as drop target
  const handleNodeDrag = useCallback((_event: any, draggedNode: Node) => {
    if ((draggedNode.data as any).isRoot) return;
    const candidates = nodes.filter(
      (n) => n.id !== draggedNode.id && !draggingDescendantIds.has(n.id)
    );
    let closest: Node | null = null;
    let minDist = Infinity;
    for (const n of candidates) {
      const dx = n.position.x - draggedNode.position.x;
      const dy = n.position.y - draggedNode.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; closest = n; }
    }
    setDropTargetId(minDist < PROXIMITY_THRESHOLD && closest ? closest.id : null);
  }, [nodes, draggingDescendantIds]);

  // Drag stop: proximity reparent + always snap back to structured layout
  const handleNodeDragStop = useCallback((_event: any, draggedNode: Node) => {
    // Clear drag visual state
    setDraggingNodeId(null);
    setDraggingDescendantIds(new Set());
    setDropTargetId(null);

    // Don't reparent the root node — just re-layout
    if ((draggedNode.data as any).isRoot) {
      applyAutoLayout(nodes, edges);
      return;
    }

    const descendantIds = collectDescendantIds(draggedNode.id, edges);
    const candidates = nodes.filter(
      (n) => n.id !== draggedNode.id && !descendantIds.has(n.id)
    );

    let closest: Node | null = null;
    let minDist = Infinity;
    for (const n of candidates) {
      const dx = n.position.x - draggedNode.position.x;
      const dy = n.position.y - draggedNode.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; closest = n; }
    }

    const currentParentEdge = edges.find((e) => e.target === draggedNode.id);
    const currentParentId = currentParentEdge?.source;

    let newParentId: string | null = null;
    if (minDist < PROXIMITY_THRESHOLD && closest) {
      if (closest.id !== currentParentId) newParentId = closest.id;
    } else {
      const rootNode = nodes.find((n) => (n.data as any).isRoot);
      if (rootNode && rootNode.id !== currentParentId) newParentId = rootNode.id;
    }

    if (newParentId) {
      takeSnapshot();
      const nextEdges = edges.filter((e) => e.target !== draggedNode.id);
      nextEdges.push({
        id: `e-${newParentId}-${draggedNode.id}`,
        source: newParentId,
        target: draggedNode.id,
        type: currentParentEdge?.type || "smoothstep",
      });
      const coloredNodes = assignDepthColors(nodes, nextEdges);
      applyAutoLayout(coloredNodes, nextEdges);
      toast.info("Nó movido para nova ramificação");
    } else {
      applyAutoLayout(nodes, edges);
    }
  }, [nodes, edges, applyAutoLayout, takeSnapshot, collectDescendantIds]);

  // Find the branch color (depth-1 ancestor's color) for a node
  const getBranchColor = useCallback((nodeId: string): string => {
    let current = nodeId;
    const chain: string[] = [];
    const visited = new Set<string>();
    while (true) {
      if (visited.has(current)) break;
      visited.add(current);
      chain.unshift(current);
      const parentEdge = edges.find((e) => e.target === current);
      if (!parentEdge) break;
      current = parentEdge.source;
    }
    // chain[0] = root, chain[1] = depth-1 node
    if (chain.length >= 2) {
      const depth1Node = nodes.find((n) => n.id === chain[1]);
      return (depth1Node?.data as any)?.color || "blue";
    }
    return "blue";
  }, [nodes, edges]);

  const handleAddChild = useCallback(() => {
    const parent = selectedNodes[0];
    if (!parent) {
      toast.info("Selecione um nó para adicionar um filho.");
      return;
    }

    takeSnapshot();
    const parentDepth = getNodeDepth(parent.id, edges);
    const childDepth = parentDepth + 1;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Determine color: depth-1 children get rotating colors, depth-2+ inherit branch color
    let childColor: string;
    let variant: string | undefined;
    if (parentDepth === 0) {
      // Adding a direct child of root — assign next rotating color
      const existingSiblings = edges.filter((e) => e.source === parent.id).length;
      const branchColors = ["blue", "green", "purple", "red", "yellow", "orange"];
      childColor = branchColors[existingSiblings % branchColors.length];
    } else {
      // Adding grandchild+ — inherit branch color, use branch variant
      childColor = getBranchColor(parent.id);
      variant = "branch";
    }

    let newData: Record<string, unknown> = { label: "Novo tópico", color: childColor, ...(variant ? { variant } : {}) };
    if (nodeType === "org") newData = { label: "Novo membro", role: "Cargo", color: childColor, ...(variant ? { variant } : {}) };
    else if (nodeType === "timeline") newData = { label: "Novo marco", date: "", color: childColor, ...(variant ? { variant } : {}) };
    else if (nodeType === "flowchart") newData = { label: "Novo passo", shape: "rectangle", color: childColor, ...(variant ? { variant } : {}) };
    else if (nodeType === "concept") newData = { label: "Novo conceito", color: childColor, ...(variant ? { variant } : {}) };

    const pos = { x: parent.position.x + 250, y: parent.position.y };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData, style: buildNodeStyle(nodeType || "mindmap", false, childDepth) };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];
    const nextEdges = [...edges, { id: `e-${parent.id}-${newId}`, source: parent.id, target: newId, type: "smoothstep" }];

    applyAutoLayout(nextNodes, nextEdges);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: newId } }));
    }, 150);
  }, [nodes, edges, selectedNodes, nodeType, takeSnapshot, applyAutoLayout, getBranchColor]);

  // Add special node (diamond / sticky)
  const handleAddSpecialNode = useCallback((type: "diamond" | "sticky") => {
    takeSnapshot();
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const centerX = 300 + Math.random() * 200;
    const centerY = 200 + Math.random() * 200;

    const newNode: Node = {
      id: newId,
      type,
      position: { x: centerX, y: centerY },
      data: {
        label: type === "diamond" ? "Sim / Não?" : "Nota...",
        color: type === "diamond" ? "default" : "default",
      },
      selected: true,
      style: type === "diamond" ? getNodeStyle("flowchart-decision") : getNodeStyle("default"),
    };

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: newId } }));
    }, 150);
  }, [takeSnapshot, setNodes]);

  // Change default edge type for new connections
  const handleEdgeTypeChange = useCallback((type: string) => {
    setCurrentEdgeType(type);
    // Also update all existing edges
    setEdges((eds) => eds.map((e) => ({ ...e, type })));
  }, [setEdges]);

  // Add sibling node (Enter) — creates a node with the same parent as the selected node
  const handleAddSibling = useCallback(() => {
    const selected = selectedNodes[0];
    if (!selected) return;

    const parentEdge = edges.find((e) => e.target === selected.id);
    if (!parentEdge) {
      handleAddChild();
      return;
    }

    takeSnapshot();
    const parentId = parentEdge.source;
    const parentDepth = getNodeDepth(parentId, edges);
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Sibling gets same color & variant as selected node
    const siblingColor = (selected.data as any)?.color || getBranchColor(selected.id);
    const variant = parentDepth >= 1 ? "branch" : undefined;

    let newData: Record<string, unknown> = { label: "Novo tópico", color: siblingColor, ...(variant ? { variant } : {}) };
    if (nodeType === "org") newData = { label: "Novo membro", role: "Cargo", color: siblingColor, ...(variant ? { variant } : {}) };
    else if (nodeType === "timeline") newData = { label: "Novo marco", date: "", color: siblingColor, ...(variant ? { variant } : {}) };
    else if (nodeType === "flowchart") newData = { label: "Novo passo", shape: "rectangle", color: siblingColor, ...(variant ? { variant } : {}) };
    else if (nodeType === "concept") newData = { label: "Novo conceito", color: siblingColor, ...(variant ? { variant } : {}) };

    const pos = { x: selected.position.x, y: selected.position.y + 80 };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData, style: buildNodeStyle(nodeType || "mindmap", false, parentDepth + 1) };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];
    const nextEdges = [...edges, { id: `e-${parentId}-${newId}`, source: parentId, target: newId, type: "smoothstep" }];

    applyAutoLayout(nextNodes, nextEdges);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: newId } }));
    }, 150);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView, nodeType, takeSnapshot, handleAddChild, applyAutoLayout, getBranchColor]);

  const handleDelete = useCallback(() => {
    const toDelete = new Set(selectedNodes.map((n) => n.id));
    for (const n of selectedNodes) {
      if ((n.data as any).isRoot) toDelete.delete(n.id);
    }
    if (toDelete.size === 0) return;

    takeSnapshot();
    const childMap = new Map<string, string[]>();
    for (const e of edges) {
      const arr = childMap.get(e.source) || [];
      arr.push(e.target);
      childMap.set(e.source, arr);
    }
    function addDescendants(id: string) {
      for (const c of childMap.get(id) || []) { toDelete.add(c); addDescendants(c); }
    }
    for (const id of [...toDelete]) addDescendants(id);

    const nextNodes = nodes.filter((n) => !toDelete.has(n.id));
    const nextEdges = edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target));
    applyAutoLayout(nextNodes, nextEdges);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, takeSnapshot, applyAutoLayout]);

  const handleColorChange = useCallback(
    (color: string) => {
      takeSnapshot();
      const ids = new Set(selectedNodes.map((n) => n.id));
      setNodes((nds) => nds.map((n) => ids.has(n.id) ? { ...n, data: { ...n.data, color } } : n));
    },
    [selectedNodes, setNodes, takeSnapshot]
  );

  const handleShapeChange = useCallback(
    (shape: string) => {
      takeSnapshot();
      const ids = new Set(selectedNodes.map((n) => n.id));
      setNodes((nds) => nds.map((n) => ids.has(n.id) ? { ...n, data: { ...n.data, shape } } : n));
    },
    [selectedNodes, setNodes, takeSnapshot]
  );

  const handleVariantChange = useCallback(
    (variant: string) => {
      takeSnapshot();
      const ids = new Set(selectedNodes.map((n) => n.id));
      setNodes((nds) => nds.map((n) => ids.has(n.id) ? { ...n, data: { ...n.data, variant } } : n));
    },
    [selectedNodes, setNodes, takeSnapshot]
  );

  const handleDuplicate = useCallback(() => {
    if (selectedNodes.length === 0) return;
    takeSnapshot();
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    for (const node of selectedNodes) {
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      newNodes.push({
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: true,
        data: { ...node.data },
      });
      // Copy edges from this node's parent
      const parentEdge = edges.find((e) => e.target === node.id);
      if (parentEdge) {
        newEdges.push({
          id: `e-${parentEdge.source}-${newId}`,
          source: parentEdge.source,
          target: newId,
          type: parentEdge.type || "smoothstep",
        });
      }
    }

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [selectedNodes, edges, setNodes, setEdges, takeSnapshot]);

  const handleSave = useCallback(async () => {
    const snapshot = buildContentSnapshot(nodes, edges, theme.id);
    if (snapshot === lastPersistedSnapshot.current) return;

    const thumb = await captureThumbnail();
    await onSaveRef.current(nodes, edges, theme.id, thumb);
    lastPersistedSnapshot.current = snapshot;
    setLastSavedAt(new Date());
  }, [nodes, edges, theme.id, captureThumbnail, buildContentSnapshot]);

  const getFlowElement = useCallback(() => {
    return document.querySelector(".react-flow__viewport") as HTMLElement | null;
  }, []);

  const handleExportPng = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "white",
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains("react-flow__minimap") && !node.classList?.contains("react-flow__controls"),
      });
      const link = document.createElement("a");
      link.download = "diagrama.png";
      link.href = dataUrl;
      link.click();
      toast.success("PNG exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar PNG");
    } finally {
      setExporting(false);
    }
  }, [getFlowElement]);

  const handleExportPdf = useCallback(async () => {
    if (!limits.exportPdf) {
      setUpgradeOpen(true);
      return;
    }
    const el = getFlowElement();
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "white",
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains("react-flow__minimap") && !node.classList?.contains("react-flow__controls"),
      });
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
      const landscape = img.width > img.height;
      const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "px", format: [img.width / 2, img.height / 2] });
      pdf.addImage(dataUrl, "PNG", 0, 0, img.width / 2, img.height / 2);
      pdf.save("diagrama.pdf");
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [getFlowElement, limits.exportPdf]);

  // Arrow key navigation between nodes
  const handleArrowNav = useCallback((direction: "up" | "down" | "left" | "right") => {
    const selected = selectedNodes[0];
    if (!selected) return;

    const parentEdge = edges.find((e) => e.target === selected.id);
    const childEdges = edges.filter((e) => e.source === selected.id);

    let targetId: string | null = null;

    if (direction === "left") {
      if (parentEdge) targetId = parentEdge.source;
    } else if (direction === "right") {
      if (childEdges.length > 0) {
        const children = childEdges
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter(Boolean) as Node[];
        children.sort((a, b) => a.position.y - b.position.y);
        targetId = children[0]?.id || null;
      }
    } else if (direction === "up" || direction === "down") {
      if (parentEdge) {
        const siblingEdges = edges.filter((e) => e.source === parentEdge.source);
        const siblings = siblingEdges
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter(Boolean) as Node[];
        siblings.sort((a, b) => a.position.y - b.position.y);
        const idx = siblings.findIndex((n) => n.id === selected.id);
        if (direction === "up" && idx > 0) targetId = siblings[idx - 1].id;
        if (direction === "down" && idx < siblings.length - 1) targetId = siblings[idx + 1].id;
      }
    }

    if (targetId) {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === targetId })));
      const targetNode = nodes.find((n) => n.id === targetId);
      if (targetNode) {
        setTimeout(() => fitView({ nodes: [{ id: targetId! }], padding: 0.5, duration: 250 }), 10);
      }
    }
  }, [nodes, edges, selectedNodes, setNodes, fitView]);

  // Move node between branches (Alt+Arrow)
  const handleMoveNode = useCallback((direction: "up" | "down" | "left" | "right") => {
    const selected = selectedNodes[0];
    if (!selected || (selected.data as any).isRoot) return;

    const parentEdge = edges.find((e) => e.target === selected.id);
    if (!parentEdge) return;

    const parentId = parentEdge.source;

    if (direction === "up" || direction === "down") {
      // Reorder among siblings: swap edge order
      const siblingEdges = edges.filter((e) => e.source === parentId);
      const siblings = siblingEdges
        .map((e) => nodes.find((n) => n.id === e.target))
        .filter(Boolean) as Node[];
      siblings.sort((a, b) => a.position.y - b.position.y);
      const idx = siblings.findIndex((n) => n.id === selected.id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return;

      takeSnapshot();
      // Swap positions in edges array to affect layout order
      const swapNodeId = siblings[swapIdx].id;
      const reorderedEdges = edges.map((e) => {
        if (e.source === parentId && e.target === selected.id) return { ...e, target: swapNodeId };
        if (e.source === parentId && e.target === swapNodeId) return { ...e, target: selected.id };
        return e;
      });
      // Fix edge IDs after swap
      const fixedEdges = reorderedEdges.map((e) => {
        if (e.source === parentId && (e.target === selected.id || e.target === swapNodeId)) {
          return { ...e, id: `e-${e.source}-${e.target}` };
        }
        return e;
      });
      applyAutoLayout(nodes, fixedEdges);
      toast.info(direction === "up" ? "Movido para cima" : "Movido para baixo");
    } else if (direction === "left") {
      // Promote: move to grandparent (become sibling of current parent)
      const grandparentEdge = edges.find((e) => e.target === parentId);
      if (!grandparentEdge) {
        toast.info("Não é possível promover — o pai é a raiz.");
        return;
      }

      takeSnapshot();
      const grandparentId = grandparentEdge.source;
      const nextEdges = edges.map((e) => {
        if (e.target === selected.id && e.source === parentId) {
          return { ...e, id: `e-${grandparentId}-${selected.id}`, source: grandparentId };
        }
        return e;
      });
      applyAutoLayout(nodes, nextEdges);
      toast.info("Nó promovido ao nível superior");
    } else if (direction === "right") {
      // Demote: move under previous sibling
      const siblingEdges = edges.filter((e) => e.source === parentId);
      const siblings = siblingEdges
        .map((e) => nodes.find((n) => n.id === e.target))
        .filter(Boolean) as Node[];
      siblings.sort((a, b) => a.position.y - b.position.y);
      const idx = siblings.findIndex((n) => n.id === selected.id);
      // Find the previous sibling to become the new parent
      const newParent = idx > 0 ? siblings[idx - 1] : (idx < siblings.length - 1 ? siblings[idx + 1] : null);
      if (!newParent) {
        toast.info("Não há irmão disponível para rebaixar.");
        return;
      }

      takeSnapshot();
      const nextEdges = edges.map((e) => {
        if (e.target === selected.id && e.source === parentId) {
          return { ...e, id: `e-${newParent.id}-${selected.id}`, source: newParent.id };
        }
        return e;
      });
      applyAutoLayout(nodes, nextEdges);
      toast.info(`Nó movido para dentro de "${(newParent.data as any).label}"`);
    }
  }, [nodes, edges, selectedNodes, takeSnapshot, applyAutoLayout]);

  // Select and focus a node by ID (used by search)
  const handleSearchSelect = useCallback((nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    setTimeout(() => fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 250 }), 10);
  }, [setNodes, fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+F always works, even in inputs
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") { e.preventDefault(); handleAddChild(); }
      if (e.key === "Enter") { e.preventDefault(); handleAddSibling(); }
      if (e.key === "Delete" || e.key === "Backspace") handleDelete();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicate(); }
      // Ctrl+Shift+L: reorganize layout
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L") { e.preventDefault(); handleReLayout(); toast.info("Layout reorganizado"); }
      // Alt+Arrow: move node between branches
      if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); handleMoveNode("up"); return; }
      if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); handleMoveNode("down"); return; }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); handleMoveNode("left"); return; }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); handleMoveNode("right"); return; }
      // Arrow navigation
      if (e.key === "ArrowUp") { e.preventDefault(); handleArrowNav("up"); }
      if (e.key === "ArrowDown") { e.preventDefault(); handleArrowNav("down"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); handleArrowNav("left"); }
      if (e.key === "ArrowRight") { e.preventDefault(); handleArrowNav("right"); }
      // F2 to edit selected node
      if (e.key === "F2" && selectedNodes.length === 1) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: selectedNodes[0].id } }));
        return;
      }
      // Type-to-edit: printable character starts editing the selected node
      if (
        selectedNodes.length === 1 &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        e.key.length === 1
      ) {
        window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: selectedNodes[0].id, replaceText: true } }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAddChild, handleAddSibling, handleDelete, handleSave, undo, redo, handleDuplicate, handleArrowNav, handleMoveNode, handleReLayout, searchOpen]);

  // AI: apply generated map
  const handleApplyGenerated = useCallback((genNodes: { id: string; label: string; isRoot?: boolean }[], genEdges: { source: string; target: string }[]) => {
    takeSnapshot();

    // Build temp edges to compute depth
    const tempEdges: Edge[] = genEdges.map((e) => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
    }));

    const newNodes: Node[] = genNodes.map((n) => {
      const depth = getNodeDepth(n.id, tempEdges);
      return {
        id: n.id,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          color: n.isRoot ? "orange" : getColorForDepth(depth),
          ...(n.isRoot ? { isRoot: true } : {}),
        },
      };
    });

    applyAutoLayout(newNodes, tempEdges);
  }, [nodeType, takeSnapshot, applyAutoLayout]);

  // AI: apply suggestion
  const handleApplySuggestion = useCallback((suggestion: { type: string; parentId?: string; nodeId?: string; label?: string; newLabel?: string }) => {
    takeSnapshot();
    if (suggestion.type === "add" && suggestion.parentId && suggestion.label) {
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const colorIdx = nodes.length % childColors.length;
      const newNode: Node = {
        id: newId,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: { label: suggestion.label, color: childColors[colorIdx] },
      };
      const nextNodes = [...nodes, newNode];
      const nextEdges = [...edges, { id: `e-${suggestion.parentId}-${newId}`, source: suggestion.parentId, target: newId, type: "smoothstep" }];
      applyAutoLayout(nextNodes, nextEdges);
    } else if (suggestion.type === "rename" && suggestion.nodeId && suggestion.newLabel) {
      setNodes((nds) => nds.map((n) => n.id === suggestion.nodeId ? { ...n, data: { ...n.data, label: suggestion.newLabel } } : n));
    }
  }, [nodes, edges, nodeType, takeSnapshot, applyAutoLayout, setNodes]);

  // Right-click on node
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  // AI expand: add generated children to existing node
  const handleExpandComplete = useCallback((parentId: string, newNodes: { id: string; label: string }[], newEdges: { source: string; target: string }[]) => {
    takeSnapshot();

    const allEdges = [...edges, ...newEdges.map((e) => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep" as const,
    }))];

    const addedNodes: Node[] = newNodes.map((n) => {
      const depth = getNodeDepth(n.id, allEdges);
      return {
        id: n.id,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: { label: n.label, color: getColorForDepth(depth) },
      };
    });

    const addedEdges: Edge[] = newEdges.map((e) => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
    }));

    applyAutoLayout([...nodes, ...addedNodes], [...edges, ...addedEdges]);
  }, [nodes, edges, nodeType, takeSnapshot, applyAutoLayout]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: theme.bg, transition: "background-color 0.3s" }}>
      <EditorToolbar
        onAddNode={handleAddChild}
        onAddSpecialNode={handleAddSpecialNode}
        onDelete={handleDelete}
        onSave={handleSave}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        onColorChange={handleColorChange}
        onUndo={undo}
        onRedo={redo}
        onExportPng={handleExportPng}
        onExportPdf={handleExportPdf}
        canExportPdf={limits.exportPdf}
        onThemeChange={setTheme}
        onReLayout={handleReLayout}
        onEdgeTypeChange={handleEdgeTypeChange}
        onAIAssist={limits.aiGeneration ? () => setAiDialogOpen(true) : undefined}
        currentThemeId={theme.id}
        currentEdgeType={currentEdgeType}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        exporting={exporting}
        hasSelection={selectedNodes.length > 0}
        diagramType={diagramType}
      />
      {(() => { const ui = themeUI(theme); return (<>
      <NodeSearchBar
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        nodes={nodes}
        onSelectNode={handleSearchSelect}
        themeCardBg={ui.cardBg}
        themeCardBorder={ui.cardBorder}
        themeCardText={ui.cardText}
      />
      {/* Autosave indicator */}
      {saving && (
        <div
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md text-xs"
          style={{ backgroundColor: ui.cardBg, borderColor: ui.cardBorder, color: ui.cardText, border: `1px solid ${ui.cardBorder}` }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ui.accentColor }} />
          Salvando...
        </div>
      )}
      {!saving && lastSavedAt && (
        <div
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md text-xs"
          style={{ backgroundColor: ui.cardBg, borderColor: ui.cardBorder, color: ui.cardText, border: `1px solid ${ui.cardBorder}` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          Salvo às {lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      </>); })()}
      <NodeFloatingToolbar
        selectedNodes={selectedNodes}
        diagramType={diagramType}
        onColorChange={handleColorChange}
        onShapeChange={handleShapeChange}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onVariantChange={handleVariantChange}
      />
      <ReactFlow
        nodes={nodes.map((n) => {
          if (!draggingNodeId) return n;
          const isDragged = n.id === draggingNodeId || draggingDescendantIds.has(n.id);
          const isDropTarget = n.id === dropTargetId;
          return {
            ...n,
            style: {
              ...n.style,
              opacity: isDragged ? 0.55 : 1,
              transition: 'opacity 0.15s ease',
              ...(isDropTarget ? { boxShadow: '0 0 0 3px hsl(var(--primary))', borderRadius: 12 } : {}),
            },
          };
        })}
        edges={draggingNodeId
          ? edges.filter((e) => e.target !== draggingNodeId && e.source !== draggingNodeId && !draggingDescendantIds.has(e.target) && !draggingDescendantIds.has(e.source))
          : edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={!initialFitDone.current}
        onInit={() => {
          if (!initialFitDone.current) {
            initialFitDone.current = true;
          }
        }}
        fitViewOptions={{ padding: 0.3 }}
        snapToGrid={true}
        snapGrid={[20, 20]}
        defaultEdgeOptions={{ type: "smoothstep", style: { stroke: theme.edgeColor, strokeWidth: theme.edgeStrokeWidth, opacity: theme.edgeOpacity ?? 1, _animation: theme.edgeAnimation, _dashArray: theme.edgeDashArray } as any }}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: theme.bg }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={theme.dotColor} />
        <Controls
          showInteractive={false}
          style={{ backgroundColor: themeUI(theme).cardBg, borderColor: themeUI(theme).cardBorder, borderRadius: 12 }}
          className="!rounded-xl !shadow-md [&>button]:!border-0"
        />
        <MiniMap
          style={{ backgroundColor: theme.minimapBg, borderColor: themeUI(theme).cardBorder, borderRadius: 12 }}
          className="!rounded-xl !shadow-md"
          maskColor={theme.minimapMask}
          nodeColor={themeUI(theme).minimapNode}
        />
      </ReactFlow>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        resource="feature"
        featureLabel="Exportação para PDF"
        planName={limits.displayName}
      />
      <AIMapAssistDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        diagramType={diagramType}
        nodes={nodes}
        edges={edges}
        onApplyGenerated={handleApplyGenerated}
        onApplySuggestion={handleApplySuggestion}
      />
      {contextMenu && limits.aiGeneration && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          diagramType={diagramType}
          onClose={() => setContextMenu(null)}
          onExpandComplete={handleExpandComplete}
        />
      )}
    </div>
  );
}

export default function DiagramEditorCore(props: DiagramEditorCoreProps) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  );
}
