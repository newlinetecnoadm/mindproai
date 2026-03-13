import { useCallback, useRef, useState, useEffect } from "react";
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

const nodeTypes = {
  mindmap: MindMapNode as any,
  flowchart: FlowchartNode as any,
  org: OrgNode as any,
  timeline: TimelineNode as any,
  concept: ConceptNode as any,
};

const childColors = ["blue", "green", "purple", "red", "yellow", "orange"];

// Map diagram_type slug to the node type key used in React Flow
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
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds)),
    [setEdges]
  );

  const selectedNodes = nodes.filter((n) => n.selected);
  const nodeType = typeToNodeType[diagramType] || "mindmap";

  const handleAddNode = useCallback(() => {
    const parent = selectedNodes[0] || nodes[0];
    const colorIdx = nodes.length % childColors.length;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let newData: Record<string, unknown> = { label: "Novo tópico", color: childColors[colorIdx] };
    if (nodeType === "org") {
      newData = { label: "Novo membro", role: "Cargo", color: childColors[colorIdx] };
    } else if (nodeType === "timeline") {
      newData = { label: "Novo marco", date: "", color: childColors[colorIdx] };
    } else if (nodeType === "flowchart") {
      newData = { label: "Novo passo", shape: "rectangle", color: childColors[colorIdx] };
    } else if (nodeType === "concept") {
      newData = { label: "Novo conceito", color: childColors[colorIdx] };
    } else if (nodeType === "mindmap") {
      newData = { label: "Novo tópico", color: childColors[colorIdx] };
    }

    const pos = parent
      ? { x: parent.position.x + 250, y: parent.position.y + 20 }
      : { x: 100, y: 100 };

    const newNode: Node = { id: newId, type: nodeType, position: pos, data: newData };
    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];

    let nextEdges = edges;
    if (parent) {
      const newEdge: Edge = {
        id: `e-${parent.id}-${newId}`,
        source: parent.id,
        target: newId,
        type: "smoothstep",
      };
      nextEdges = [...edges, newEdge];
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView, nodeType]);

  const handleDelete = useCallback(() => {
    const toDelete = new Set(selectedNodes.map((n) => n.id));
    // Don't delete root nodes in mindmaps
    for (const n of selectedNodes) {
      if ((n.data as any).isRoot) toDelete.delete(n.id);
    }
    if (toDelete.size === 0) return;

    // Also delete descendants
    const childMap = new Map<string, string[]>();
    for (const e of edges) {
      const arr = childMap.get(e.source) || [];
      arr.push(e.target);
      childMap.set(e.source, arr);
    }
    function addDescendants(id: string) {
      for (const c of childMap.get(id) || []) {
        toDelete.add(c);
        addDescendants(c);
      }
    }
    for (const id of [...toDelete]) addDescendants(id);

    setNodes(nodes.filter((n) => !toDelete.has(n.id)));
    setEdges(edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target)));
  }, [nodes, edges, selectedNodes, setNodes, setEdges]);

  const handleColorChange = useCallback(
    (color: string) => {
      const ids = new Set(selectedNodes.map((n) => n.id));
      setNodes((nds) =>
        nds.map((n) => ids.has(n.id) ? { ...n, data: { ...n.data, color } } : n)
      );
    },
    [selectedNodes, setNodes]
  );

  const handleSave = useCallback(() => onSave(nodes, edges), [nodes, edges, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") { e.preventDefault(); handleAddNode(); }
      if (e.key === "Delete" || e.key === "Backspace") handleDelete();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAddNode, handleDelete, handleSave]);

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
        saving={saving}
        hasSelection={selectedNodes.length > 0}
        diagramType={diagramType}
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
