import { useCallback, useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { autoLayoutDiagram } from "@/components/mindmap/mindmapLayout";
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
import EditorToolbar from "./EditorToolbar";
import NodeFloatingToolbar from "./NodeFloatingToolbar";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { editorThemes, type EditorTheme } from "./editorThemes";

const nodeTypes = {
  mindmap: MindMapNode as any,
  flowchart: FlowchartNode as any,
  org: OrgNode as any,
  timeline: TimelineNode as any,
  concept: ConceptNode as any,
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
  const [theme, setTheme] = useState<EditorTheme>(
    editorThemes.find((t) => t.id === initialThemeId) || editorThemes[0]
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChanges = useRef(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

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

  // Autosave: only on explicit inactivity (10s debounce), not on every keystroke
  const pendingChanges = useRef(false);
  useEffect(() => {
    // Skip initial render
    if (!hasChanges.current) {
      hasChanges.current = true;
      return;
    }
    pendingChanges.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (!pendingChanges.current) return;
      try {
        const thumb = await captureThumbnail();
        await onSave(nodes, edges, theme.id, thumb);
        setLastSavedAt(new Date());
        pendingChanges.current = false;
      } catch {
        // silent fail — manual save still available
      }
    }, 10000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [nodes, edges, theme, onSave, captureThumbnail]);

  // Apply remote updates from other users
  const remoteUpdateRef = useRef(false);
  useEffect(() => {
    if (remoteNodes && remoteNodes.length > 0) {
      remoteUpdateRef.current = true;
      setNodes(remoteNodes);
      setEdges(remoteEdges || []);
      if (remoteThemeId) {
        const newTheme = editorThemes.find((t) => t.id === remoteThemeId);
        if (newTheme) setTheme(newTheme);
      }
      // Reset flag after React processes the state update
      requestAnimationFrame(() => { remoteUpdateRef.current = false; });
    }
  }, [remoteNodes, remoteEdges, remoteThemeId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds));
    },
    [setEdges, takeSnapshot]
  );

  const selectedNodes = nodes.filter((n) => n.selected);
  const nodeType = typeToNodeType[diagramType] || "mindmap";

  // Auto-layout helper for mindmaps
  const applyMindmapLayout = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (diagramType === "mindmap") {
      const laid = autoLayoutMindMap(nextNodes, nextEdges);
      setNodes(laid.nodes);
      setEdges(laid.edges);
    } else {
      setNodes(nextNodes);
      setEdges(nextEdges);
    }
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [diagramType, setNodes, setEdges, fitView]);

  const handleAddChild = useCallback(() => {
    takeSnapshot();
    const parent = selectedNodes[0] || nodes[0];
    const colorIdx = nodes.length % childColors.length;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let newData: Record<string, unknown> = { label: "Novo tópico", color: childColors[colorIdx] };
    if (nodeType === "org") newData = { label: "Novo membro", role: "Cargo", color: childColors[colorIdx] };
    else if (nodeType === "timeline") newData = { label: "Novo marco", date: "", color: childColors[colorIdx] };
    else if (nodeType === "flowchart") newData = { label: "Novo passo", shape: "rectangle", color: childColors[colorIdx] };
    else if (nodeType === "concept") newData = { label: "Novo conceito", color: childColors[colorIdx] };

    // Temporary position — layout will fix it
    const pos = parent
      ? { x: parent.position.x + 250, y: parent.position.y }
      : { x: 100, y: 100 };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];

    let nextEdges = edges;
    if (parent) {
      nextEdges = [...edges, { id: `e-${parent.id}-${newId}`, source: parent.id, target: newId, type: "smoothstep" }];
    }

    applyMindmapLayout(nextNodes, nextEdges);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView, nodeType, takeSnapshot, applyMindmapLayout]);

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

    applyMindmapLayout(nextNodes, nextEdges);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView, nodeType, takeSnapshot, handleAddChild, applyMindmapLayout]);

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
    applyMindmapLayout(nextNodes, nextEdges);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, takeSnapshot, applyMindmapLayout]);

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
    const thumb = await captureThumbnail();
    onSave(nodes, edges, theme.id, thumb);
  }, [nodes, edges, theme, onSave, captureThumbnail]);

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
  }, [getFlowElement]);

  // Arrow key navigation between nodes
  const handleArrowNav = useCallback((direction: "up" | "down" | "left" | "right") => {
    const selected = selectedNodes[0];
    if (!selected) {
      // Select first node if nothing selected
      if (nodes.length > 0) {
        setNodes((nds) => nds.map((n, i) => ({ ...n, selected: i === 0 })));
      }
      return;
    }

    const parentEdge = edges.find((e) => e.target === selected.id);
    const childEdges = edges.filter((e) => e.source === selected.id);

    let targetId: string | null = null;

    if (direction === "left") {
      // Go to parent
      if (parentEdge) targetId = parentEdge.source;
    } else if (direction === "right") {
      // Go to first child
      if (childEdges.length > 0) {
        // Pick child closest to current Y position
        const children = childEdges
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter(Boolean) as Node[];
        children.sort((a, b) => a.position.y - b.position.y);
        targetId = children[0]?.id || null;
      }
    } else if (direction === "up" || direction === "down") {
      // Navigate siblings (nodes sharing the same parent)
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
      // Center view on the newly selected node
      const targetNode = nodes.find((n) => n.id === targetId);
      if (targetNode) {
        setTimeout(() => fitView({ nodes: [{ id: targetId! }], padding: 0.5, duration: 250 }), 10);
      }
    }
  }, [nodes, edges, selectedNodes, setNodes, fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") { e.preventDefault(); handleAddChild(); }
      if (e.key === "Enter") { e.preventDefault(); handleAddSibling(); }
      if (e.key === "Delete" || e.key === "Backspace") handleDelete();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicate(); }
      // Arrow navigation
      if (e.key === "ArrowUp") { e.preventDefault(); handleArrowNav("up"); }
      if (e.key === "ArrowDown") { e.preventDefault(); handleArrowNav("down"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); handleArrowNav("left"); }
      if (e.key === "ArrowRight") { e.preventDefault(); handleArrowNav("right"); }
      // F2 to edit selected node
      if (e.key === "F2" && selectedNodes.length === 1) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: selectedNodes[0].id } }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAddChild, handleAddSibling, handleDelete, handleSave, undo, redo, handleDuplicate, handleArrowNav]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: theme.bg, transition: "background-color 0.3s" }}>
      <EditorToolbar
        onAddNode={handleAddChild}
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
        onThemeChange={setTheme}
        currentThemeId={theme.id}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        exporting={exporting}
        hasSelection={selectedNodes.length > 0}
        diagramType={diagramType}
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
        nodeTypes={nodeTypes}
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
