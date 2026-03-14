import { useCallback, useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import { autoLayoutDiagram, rerouteDiagramEdges } from "@/components/mindmap/mindmapLayout";
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
import "@xyflow/react/dist/style.css";
import MindMapNode from "@/components/mindmap/MindMapNode";
import FlowchartNode from "./nodes/FlowchartNode";
import OrgNode from "./nodes/OrgNode";
import TimelineNode from "./nodes/TimelineNode";
import ConceptNode from "./nodes/ConceptNode";
import DiamondNode from "./nodes/DiamondNode";
import StickyNoteNode from "./nodes/StickyNoteNode";
import { CurvedEdge, OrthogonalEdge, StraightEdge, HierarchyEdge } from "./edges/CustomEdges";
import EditorToolbar from "./EditorToolbar";
import NodeFloatingToolbar from "./NodeFloatingToolbar";
import NodeSearchBar from "./NodeSearchBar";
import AIMapAssistDialog from "./AIMapAssistDialog";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { editorThemes, type EditorTheme } from "./editorThemes";

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

function DiagramEditorInner({ diagramType, initialNodes, initialEdges, initialThemeId, onSave, saving, remoteNodes, remoteEdges, remoteThemeId }: DiagramEditorCoreProps) {
  const getInitialLayout = () => {
    const n = initialNodes || [];
    const e = initialEdges || [];
    if (n.length > 0) {
      return autoLayoutDiagram(n, e, diagramType);
    }
    return { nodes: n, edges: e };
  };
  const initialLayout = getInitialLayout();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);
  const [exporting, setExporting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const limits = usePlanLimits();
  const [theme, setTheme] = useState<EditorTheme>(
    editorThemes.find((t) => t.id === initialThemeId) || editorThemes[0]
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentEdgeType, setCurrentEdgeType] = useState("smoothstep");
  const pinnedPositions = useRef<Set<string>>(new Set());
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChanges = useRef(false);
  const lastPersistedSnapshot = useRef<string | null>(null);
  const remoteUpdateRef = useRef(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
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

      const snapshotBeforeSave = buildContentSnapshot(nodes, edges, theme.id);
      if (snapshotBeforeSave === lastPersistedSnapshot.current) {
        pendingChanges.current = false;
        return;
      }

      try {
        const thumb = await captureThumbnail();
        await onSave(nodes, edges, theme.id, thumb);
        setLastSavedAt(new Date());
        lastPersistedSnapshot.current = snapshotBeforeSave;
        pendingChanges.current = false;
      } catch {
        // silent fail — manual save still available
      }
    }, 10000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [nodes, edges, theme.id, onSave, captureThumbnail, buildContentSnapshot]);

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

  // Auto-layout helper — respects manually pinned nodes
  const applyAutoLayout = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    for (const pinnedId of [...pinnedPositions.current]) {
      if (!nextNodes.some((node) => node.id === pinnedId)) {
        pinnedPositions.current.delete(pinnedId);
      }
    }

    const laid = autoLayoutDiagram(nextNodes, nextEdges, diagramType);

    if (pinnedPositions.current.size === 0) {
      setNodes(laid.nodes);
      setEdges(laid.edges);
    } else {
      const pinnedMap = new Map(
        nextNodes
          .filter((node) => pinnedPositions.current.has(node.id))
          .map((node) => [node.id, node.position])
      );

      const mergedNodes = laid.nodes.map((node) => {
        const pinnedPosition = pinnedMap.get(node.id);
        return pinnedPosition ? { ...node, position: pinnedPosition } : node;
      });

      setNodes(mergedNodes);
      setEdges(rerouteDiagramEdges(mergedNodes, laid.edges, diagramType));
    }

    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [diagramType, setNodes, setEdges, fitView]);

  // Re-layout all nodes (clear pinned positions)
  const handleReLayout = useCallback(() => {
    takeSnapshot();
    pinnedPositions.current.clear();
    const laid = autoLayoutDiagram(nodes, edges, diagramType);
    setNodes(laid.nodes);
    setEdges(laid.edges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, edges, diagramType, setNodes, setEdges, fitView, takeSnapshot]);

  // Mark node as pinned when user drags it
  const handleNodeDragStop = useCallback((_event: any, node: Node) => {
    pinnedPositions.current.add(node.id);
    const updatedNodes = nodes.map((currentNode) =>
      currentNode.id === node.id ? { ...currentNode, position: node.position } : currentNode
    );
    setEdges((currentEdges) => rerouteDiagramEdges(updatedNodes, currentEdges, diagramType));
  }, [nodes, setEdges, diagramType]);

  const handleAddChild = useCallback(() => {
    const parent = selectedNodes[0];
    if (!parent) {
      toast.info("Selecione um nó para adicionar um filho.");
      return;
    }

    takeSnapshot();
    const colorIdx = nodes.length % childColors.length;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let newData: Record<string, unknown> = { label: "Novo tópico", color: childColors[colorIdx] };
    if (nodeType === "org") newData = { label: "Novo membro", role: "Cargo", color: childColors[colorIdx] };
    else if (nodeType === "timeline") newData = { label: "Novo marco", date: "", color: childColors[colorIdx] };
    else if (nodeType === "flowchart") newData = { label: "Novo passo", shape: "rectangle", color: childColors[colorIdx] };
    else if (nodeType === "concept") newData = { label: "Novo conceito", color: childColors[colorIdx] };

    // Temporary position — layout will fix it
    const pos = { x: parent.position.x + 250, y: parent.position.y };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];
    const nextEdges = [...edges, { id: `e-${parent.id}-${newId}`, source: parent.id, target: newId, type: "smoothstep" }];

    applyAutoLayout(nextNodes, nextEdges);

    // Auto-enter edit mode on the new node
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: newId } }));
    }, 150);
  }, [nodes, edges, selectedNodes, nodeType, takeSnapshot, applyAutoLayout]);

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
    const colorIdx = nodes.length % childColors.length;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let newData: Record<string, unknown> = { label: "Novo tópico", color: childColors[colorIdx] };
    if (nodeType === "org") newData = { label: "Novo membro", role: "Cargo", color: childColors[colorIdx] };
    else if (nodeType === "timeline") newData = { label: "Novo marco", date: "", color: childColors[colorIdx] };
    else if (nodeType === "flowchart") newData = { label: "Novo passo", shape: "rectangle", color: childColors[colorIdx] };
    else if (nodeType === "concept") newData = { label: "Novo conceito", color: childColors[colorIdx] };

    const pos = { x: selected.position.x, y: selected.position.y + 80 };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];
    const nextEdges = [...edges, { id: `e-${parentId}-${newId}`, source: parentId, target: newId, type: "smoothstep" }];

    applyAutoLayout(nextNodes, nextEdges);

    // Auto-enter edit mode on the new node
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: newId } }));
    }, 150);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView, nodeType, takeSnapshot, handleAddChild, applyAutoLayout]);

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
    await onSave(nodes, edges, theme.id, thumb);
    lastPersistedSnapshot.current = snapshot;
    setLastSavedAt(new Date());
  }, [nodes, edges, theme.id, onSave, captureThumbnail, buildContentSnapshot]);

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
  }, [handleAddChild, handleAddSibling, handleDelete, handleSave, undo, redo, handleDuplicate, handleArrowNav, handleMoveNode, searchOpen]);

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
        currentThemeId={theme.id}
        currentEdgeType={currentEdgeType}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        exporting={exporting}
        hasSelection={selectedNodes.length > 0}
        diagramType={diagramType}
      />
      <NodeSearchBar
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        nodes={nodes}
        onSelectNode={handleSearchSelect}
        themeCardBg={theme.cardBg}
        themeCardBorder={theme.cardBorder}
        themeCardText={theme.cardText}
      />
      {/* Autosave indicator */}
      {saving && (
        <div
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md text-xs"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder, color: theme.cardText, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.nodeColor }} />
          Salvando...
        </div>
      )}
      {!saving && lastSavedAt && (
        <div
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md text-xs"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder, color: theme.cardText, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          Salvo às {lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      <NodeFloatingToolbar
        selectedNodes={selectedNodes}
        diagramType={diagramType}
        onColorChange={handleColorChange}
        onShapeChange={handleShapeChange}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{ type: "smoothstep", style: { stroke: theme.edgeColor, strokeWidth: 2 } }}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: theme.bg }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={theme.dotColor} />
        <Controls
          showInteractive={false}
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderRadius: 12 }}
          className="!rounded-xl !shadow-md [&>button]:!border-0"
        />
        <MiniMap
          style={{ backgroundColor: theme.minimapBg, borderColor: theme.cardBorder, borderRadius: 12 }}
          className="!rounded-xl !shadow-md"
          maskColor={theme.minimapMask}
          nodeColor={theme.minimapNode}
        />
      </ReactFlow>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        resource="feature"
        featureLabel="Exportação para PDF"
        planName={limits.displayName}
      />
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
