import { useEffect, useRef, useCallback } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { autoLayoutDiagram } from '@/components/mindmap/mindmapLayout';
import { assignDepthColors, assignEdgeColors, type EdgeThemeOptions } from '@/components/mindmap/depthColors';
import { getNodeDimensions } from '@/lib/diagramUtils';
import { buildNodeStyle } from '@/lib/nodeStyles';

/** Inflate dimensions for layout calculation. */
function withMeasured(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    const { w, h } = getNodeDimensions(n);
    return { ...n, width: w, height: h };
  });
}

/**
 * Apply computed positions back to the ORIGINAL nodes (preserving measured, width, height).
 * This prevents React Flow from emitting spurious 'dimensions' change events caused by
 * explicit width/height values diverging from actual DOM measurements.
 */
/**
 * Apply computed positions and STYLES back to the ORIGINAL nodes.
 */
function applyResults(originalNodes: Node[], laidOutNodes: Node[], diagramType: string): Node[] {
  const nodeMap = new Map(laidOutNodes.map((n) => [n.id, n]));
  return originalNodes.map((n) => {
    const updated = nodeMap.get(n.id);
    if (!updated) return n;
    
    // Build style based on new data (depth, branchHex)
    const style = buildNodeStyle(
      diagramType,
      Boolean((updated.data as any)?.isRoot),
      (updated.data as any)?.depth ?? 1,
      (updated.data as any)?.branchHex
    );

    return {
      ...n,
      position: updated.position ?? n.position,
      data: { 
        ...n.data, 
        ...updated.data,
        style, // Sync style to data for custom components
      },
      style, // Top-level style for React Flow wrapper
    };
  });
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
    
    let positioned = laid.nodes;
    if (diagramType === 'mindmap' || diagramType === 'orgchart') {
      const opts = themeRef.current;
      positioned = assignDepthColors(laid.nodes, laid.edges, opts);
    }

    const finalNodes = applyResults(nodes, positioned, diagramType);
    const finalEdges = (diagramType === 'mindmap' || diagramType === 'orgchart') 
      ? assignEdgeColors(finalNodes, laid.edges, themeRef.current) 
      : laid.edges;

    setNodesRef.current(finalNodes);
    setEdgesRef.current(finalEdges);
    
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
    
    let processedNodes = laid.nodes;
    if (diagramType === 'mindmap' || diagramType === 'orgchart') {
      const opts = themeRef.current;
      processedNodes = assignDepthColors(laid.nodes, laid.edges, opts);
    }

    const finalNodes = applyResults(nodes, processedNodes, diagramType);
    const finalEdges = (diagramType === 'mindmap' || diagramType === 'orgchart')
      ? assignEdgeColors(finalNodes, laid.edges, themeRef.current)
      : laid.edges;

    setNodesRef.current(finalNodes);
    setEdgesRef.current(finalEdges);
  }, [getNodes, getEdges, diagramType]);

  return { triggerLayout };
}
