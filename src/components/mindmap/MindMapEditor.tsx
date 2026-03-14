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
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MindMapNode from "./MindMapNode";
import MindMapToolbar from "./MindMapToolbar";
import { autoLayout, generateNodeId, createInitialNodes } from "./mindmapUtils";
import { getNodeDepth, getColorForDepth } from "./depthColors";
import type { MindMapNodeData } from "./MindMapNode";

const nodeTypes = { mindmap: MindMapNode as any };

const childColors = ["blue", "green", "purple", "red", "yellow", "orange"];

interface MindMapEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => Promise<void>;
  saving: boolean;
}

function MindMapEditorInner({ initialNodes, initialEdges, onSave, saving }: MindMapEditorProps) {
  const defaultData = useRef(createInitialNodes());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || defaultData.current.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || defaultData.current.edges);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds)),
    [setEdges]
  );

  const selectedNodes = nodes.filter((n) => n.selected);

  const handleAddChild = useCallback(() => {
    const parent = selectedNodes[0] || nodes.find((n) => (n.data as MindMapNodeData).isRoot);
    if (!parent) return;

    const colorIdx = getNodeDepth(parent.id, edges) + 1;
    const childColor = getColorForDepth(colorIdx);
    const newId = generateNodeId();
    const newNode: Node = {
      id: newId,
      type: "mindmap",
      position: { x: parent.position.x + 250, y: parent.position.y },
      data: { label: "Novo tópico", color: childColor } as MindMapNodeData,
    };
    const newEdge: Edge = {
      id: `e-${parent.id}-${newId}`,
      source: parent.id,
      target: newId,
      type: "smoothstep",
    };

    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }];
    const nextEdges = [...edges, newEdge];
    const laid = autoLayout(nextNodes, nextEdges);
    setNodes(laid);
    setEdges(nextEdges);

    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, edges, selectedNodes, setNodes, setEdges, fitView]);

  const handleDelete = useCallback(() => {
    const toDelete = new Set(selectedNodes.map((n) => n.id));
    // Don't delete root
    for (const n of selectedNodes) {
      if ((n.data as MindMapNodeData).isRoot) toDelete.delete(n.id);
    }
    if (toDelete.size === 0) return;

    // Also delete all descendants
    const childMap = new Map<string, string[]>();
    for (const e of edges) {
      const arr = childMap.get(e.source) || [];
      arr.push(e.target);
      childMap.set(e.source, arr);
    }
    function addDescendants(id: string) {
      const children = childMap.get(id) || [];
      for (const c of children) {
        toDelete.add(c);
        addDescendants(c);
      }
    }
    for (const id of [...toDelete]) addDescendants(id);

    const nextNodes = nodes.filter((n) => !toDelete.has(n.id));
    const nextEdges = edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target));
    const laid = autoLayout(nextNodes, nextEdges);
    setNodes(laid);
    setEdges(nextEdges);
  }, [nodes, edges, selectedNodes, setNodes, setEdges]);

  const handleColorChange = useCallback(
    (color: string) => {
      const selectedIds = new Set(selectedNodes.map((n) => n.id));
      setNodes((nds) =>
        nds.map((n) =>
          selectedIds.has(n.id)
            ? { ...n, data: { ...n.data, color } }
            : n
        )
      );
    },
    [selectedNodes, setNodes]
  );

  const handleSave = useCallback(() => {
    onSave(nodes, edges);
  }, [nodes, edges, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") {
        e.preventDefault();
        handleAddChild();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDelete();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAddChild, handleDelete, handleSave]);

  return (
    <div className="w-full h-full relative">
      <MindMapToolbar
        onAddChild={handleAddChild}
        onDelete={handleDelete}
        onSave={handleSave}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        onColorChange={handleColorChange}
        saving={saving}
        hasSelection={selectedNodes.length > 0}
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
      </ReactFlow>
    </div>
  );
}

export default function MindMapEditor(props: MindMapEditorProps) {
  return (
    <ReactFlowProvider>
      <MindMapEditorInner {...props} />
    </ReactFlowProvider>
  );
}
