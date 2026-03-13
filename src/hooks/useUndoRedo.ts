import { useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

export function useUndoRedo(
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void,
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void
) {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const isUndoRedoing = useRef(false);

  const takeSnapshot = useCallback(() => {
    if (isUndoRedoing.current) return;
    undoStack.current.push({
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: edges.map((e) => ({ ...e })),
    });
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    isUndoRedoing.current = true;
    redoStack.current.push({
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: edges.map((e) => ({ ...e })),
    });
    setNodes(prev.nodes);
    setEdges(prev.edges);
    requestAnimationFrame(() => { isUndoRedoing.current = false; });
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    isUndoRedoing.current = true;
    undoStack.current.push({
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: edges.map((e) => ({ ...e })),
    });
    setNodes(next.nodes);
    setEdges(next.edges);
    requestAnimationFrame(() => { isUndoRedoing.current = false; });
  }, [nodes, edges, setNodes, setEdges]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return { takeSnapshot, undo, redo, canUndo, canRedo };
}
