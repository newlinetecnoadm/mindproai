import { useEffect, useRef, useCallback } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { autoLayoutDiagram } from '@/components/mindmap/mindmapLayout';

export function useAutoLayout(diagramType: string) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized({
    includeHiddenNodes: false,
  });
  const hasLayouted = useRef(false);

  useEffect(() => {
    // Só roda quando TODOS os nós visíveis foram medidos pelo RF
    if (!nodesInitialized) return;

    // Evita loop infinito: layout só roda uma vez por "batch" de nós
    if (hasLayouted.current) return;
    hasLayouted.current = true;

    const nodes = getNodes();
    const edges = getEdges();

    // Usa node.measured.width e node.measured.height — dimensões REAIS
    const nodesWithMeasured = nodes.map((n) => ({
      ...n,
      width: n.measured?.width ?? n.width ?? 140,
      height: n.measured?.height ?? n.height ?? 40,
    }));

    const laid = autoLayoutDiagram(nodesWithMeasured, edges, diagramType);
    setNodes(laid.nodes);
    setEdges(laid.edges);
    
    // Pequeno atraso para o fitView funcionar após o DOM atualizar
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [nodesInitialized, diagramType, getNodes, getEdges, setNodes, setEdges, fitView]);

  // Expõe função para re-layout manual
  const triggerLayout = useCallback(() => {
    hasLayouted.current = false;
  }, []);

  return { triggerLayout };
}
