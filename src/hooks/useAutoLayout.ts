import { useEffect, useRef, useCallback } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { autoLayoutDiagram } from '@/components/mindmap/mindmapLayout';
import { assignDepthColors, assignEdgeColors, type EdgeThemeOptions } from '@/components/mindmap/depthColors';

/** Inflate measured/estimated dimensions for layout calculation only. */
function withMeasured(nodes: Node[]): Node[] {
  return nodes.map((n) => ({
    ...n,
    width: n.measured?.width ?? (n.data as any)?.isRoot ? 180 : 120,
    height: n.measured?.height ?? (n.data as any)?.isRoot ? 40 : 28,
  }));
}

/**
 * Apply computed positions back to the ORIGINAL nodes (preserving measured, width, height).
 * This prevents React Flow from emitting spurious 'dimensions' change events caused by
 * explicit width/height values diverging from actual DOM measurements.
 */
function applyPositions(originalNodes: Node[], laidOutNodes: Node[]): Node[] {
  const posMap = new Map(laidOutNodes.map((n) => [n.id, n.position]));
  return originalNodes.map((n) => ({
    ...n,
    position: posMap.get(n.id) ?? n.position,
  }));
}

export function useAutoLayout(
  diagramType: string,
  themeOptions?: EdgeThemeOptions,
  /** Component-level node setter from useNodesState — required for controlled mode */
  setComponentNodes?: (nodes: Node[]) => void,
  /** Component-level edge setter from useEdgesState — required for controlled mode */
  setComponentEdges?: (edges: Edge[]) => void,
) {
  const { getNodes, getEdges, setNodes: setStoreNodes, setEdges: setStoreEdges, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: false });
  const hasLayouted = useRef(false);
  const themeRef = useRef(themeOptions);
  themeRef.current = themeOptions;
  const setNodesRef = useRef(setComponentNodes ?? setStoreNodes);
  setNodesRef.current = setComponentNodes ?? setStoreNodes;
  const setEdgesRef = useRef(setComponentEdges ?? setStoreEdges);
  setEdgesRef.current = setComponentEdges ?? setStoreEdges;

  // Initial layout: runs once when nodes are first measured by React Flow
  useEffect(() => {
    if (!nodesInitialized) return;
    if (hasLayouted.current) return;
    hasLayouted.current = true;

    const nodes = getNodes();
    const edges = getEdges();
    const laid = autoLayoutDiagram(withMeasured(nodes), edges, diagramType);
    // Restore original nodes with updated positions only (don't pass explicit width/height)
    const positioned = applyPositions(nodes, laid.nodes);

    if (diagramType === 'mindmap' || diagramType === 'orgchart') {
      const opts = themeRef.current;
      const coloredNodes = assignDepthColors(positioned, laid.edges, opts);
      const coloredEdges = assignEdgeColors(coloredNodes, laid.edges, opts);
      setNodesRef.current(coloredNodes);
      setEdgesRef.current(coloredEdges);
    } else {
      setNodesRef.current(positioned);
      setEdgesRef.current(laid.edges);
    }
    setTimeout(() => { fitView({ padding: 0.2, duration: 300 }); }, 50);
  }, [nodesInitialized, diagramType, getNodes, getEdges, fitView]);

  /**
   * triggerLayout: direct re-layout after structural changes (add/remove/collapse).
   * IMPORTANT: positions are applied back to ORIGINAL nodes (no width/height override)
   * to prevent infinite dimension-change loops in React Flow's controlled mode.
   */
  const triggerLayout = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    if (nodes.length === 0) return;

    const laid = autoLayoutDiagram(withMeasured(nodes), edges, diagramType);
    const positioned = applyPositions(nodes, laid.nodes);

    if (diagramType === 'mindmap' || diagramType === 'orgchart') {
      const opts = themeRef.current;
      const coloredNodes = assignDepthColors(positioned, laid.edges, opts);
      const coloredEdges = assignEdgeColors(coloredNodes, laid.edges, opts);
      setNodesRef.current(coloredNodes);
      setEdgesRef.current(coloredEdges);
    } else {
      setNodesRef.current(positioned);
      setEdgesRef.current(laid.edges);
    }
  }, [getNodes, getEdges, diagramType]);

  return { triggerLayout };
}
