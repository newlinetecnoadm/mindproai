import { useEffect, useRef, useCallback } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { autoLayoutDiagram } from '@/components/mindmap/mindmapLayout';
import { assignDepthColors, assignEdgeColors, type EdgeThemeOptions } from '@/components/mindmap/depthColors';

/** Inflate measured/estimated dimensions for layout calculation only. */
function withMeasured(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.measured?.width !== undefined && n.measured?.height !== undefined) {
      return n;
    }
    // Sync estimation logic with mindmapLayout.ts
    const label = (n.data as any)?.label || "";
    const subLabel = (n.data as any)?.subLabel || "";
    const estW = Math.max(80, Math.max(label.length * 9, subLabel.length * 7) + 24);
    const isRoot = (n.data as any)?.isRoot;
    
    return {
      ...n,
      width: isRoot ? Math.max(180, estW) : estW,
      height: isRoot ? 40 : (subLabel ? 54 : 40),
    };
  });
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
  const prevNodesCount = useRef(0);
  const themeRef = useRef(themeOptions);
  themeRef.current = themeOptions;
  const setNodesRef = useRef(setComponentNodes ?? setStoreNodes);
  setNodesRef.current = setComponentNodes ?? setStoreNodes;
  const setEdgesRef = useRef(setComponentEdges ?? setStoreEdges);
  setEdgesRef.current = setComponentEdges ?? setStoreEdges;

  // Initial layout: runs once when nodes are first measured by React Flow
  useEffect(() => {
    if (!nodesInitialized) return;
    
    const nodes = getNodes();
    const edges = getEdges();
    
    // Reset layout flag if node count changed to allow a pass after measurement
    if (nodes.length !== prevNodesCount.current) {
      hasLayouted.current = false;
      prevNodesCount.current = nodes.length;
    }

    if (hasLayouted.current) return;
    hasLayouted.current = true;

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
