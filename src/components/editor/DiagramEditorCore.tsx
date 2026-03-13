import { useCallback, useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
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
  onSave: (nodes: Node[], edges: Edge[]) => Promise<void>;
  saving: boolean;
}

function DiagramEditorInner({ diagramType, initialNodes, initialEdges, onSave, saving }: DiagramEditorCoreProps) {
  const defaultNodes = initialNodes || [];
  const defaultEdges = initialEdges || [];
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [exporting, setExporting] = useState(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds));
    },
    [setEdges, takeSnapshot]
  );

  const selectedNodes = nodes.filter((n) => n.selected);
  const nodeType = typeToNodeType[diagramType] || "mindmap";

  const handleAddNode = useCallback(() => {
    takeSnapshot();
    const parent = selectedNodes[0] || nodes[0];
    const colorIdx = nodes.length % childColors.length;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let newData: Record<string, unknown> = { label: "Novo tópico", color: childColors[colorIdx] };
    if (nodeType === "org") newData = { label: "Novo membro", role: "Cargo", color: childColors[colorIdx] };
    else if (nodeType === "timeline") newData = { label: "Novo marco", date: "", color: childColors[colorIdx] };
    else if (nodeType === "flowchart") newData = { label: "Novo passo", shape: "rectangle", color: childColors[colorIdx] };
    else if (nodeType === "concept") newData = { label: "Novo conceito", color: childColors[colorIdx] };

    const pos = parent
      ? { x: parent.position.x + 250, y: parent.position.y + 20 }
      : { x: 100, y: 100 };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];

    let nextEdges = edges;
    if (parent) {
      nextEdges = [...edges, { id: `e-${parent.id}-${newId}`, source: parent.id, target: newId, type: "smoothstep" }];
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView, nodeType, takeSnapshot]);

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

    setNodes(nodes.filter((n) => !toDelete.has(n.id)));
    setEdges(edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target)));
  }, [nodes, edges, selectedNodes, setNodes, setEdges, takeSnapshot]);

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

  const handleSave = useCallback(() => onSave(nodes, edges), [nodes, edges, onSave]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") { e.preventDefault(); handleAddNode(); }
      if (e.key === "Delete" || e.key === "Backspace") handleDelete();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAddNode, handleDelete, handleSave, undo, redo, handleDuplicate]);

  return (
    <div className="w-full h-full relative">
      <EditorToolbar
        onAddNode={handleAddNode}
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
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        exporting={exporting}
        hasSelection={selectedNodes.length > 0}
        diagramType={diagramType}
      />
      <NodeFloatingToolbar
        selectedNodes={selectedNodes}
        diagramType={diagramType}
        onColorChange={handleColorChange}
        onShapeChange={handleShapeChange}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onAddChild={handleAddNode}
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
        defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "hsl(var(--border))", strokeWidth: 2 } }}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !rounded-xl !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground"
        />
        <MiniMap
          className="!bg-card !border-border !rounded-xl !shadow-md"
          maskColor="hsl(var(--muted) / 0.7)"
          nodeColor="hsl(var(--primary))"
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
