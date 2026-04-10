import { useCallback, useEffect, useRef } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useReactFlow, useNodesInitialized } from "@xyflow/react";
import { useMindMapStore } from "@/store/useMindMapStore";

// Singleton ELK fora do hook
const elk = new ELK();

// Opções ELK para sub-grafos direcionais
function elkOptions(direction: "RIGHT" | "LEFT") {
  return {
    "elk.algorithm": "layered",
    "elk.direction": direction,
    // Espaço horizontal entre camadas (root→depth1, depth1→depth2, etc.)
    "elk.layered.spacing.nodeNodeBetweenLayers": "110",
    // Espaço vertical entre irmãos
    "elk.spacing.nodeNode": "28",
    // BRANDES_KOEPF + BALANCED: centra filhos ao redor do pai (evita filhos
    // "vagando" para longe do nó pai como acontece com SIMPLE)
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    // LAYER_SWEEP minimiza cruzamentos sem descentrar os nós
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "SPLINES",
    "elk.padding": "[top=20, left=20, bottom=20, right=20]",
  };
}


// Opções ELK para layout vertical (orgchart/flowchart)
function elkOptionsDown() {
  return {
    "elk.algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    "elk.spacing.nodeNode": "40",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "SPLINES",
    "elk.padding": "[top=40, left=60, bottom=40, right=60]",
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useElkLayout() {
  const { getNodes, setNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const visibleEdges = useMindMapStore((s) => s.visibleEdges);
  const visibleNodes = useMindMapStore((s) => s.visibleNodes);
  const diagramType = useMindMapStore((s) => s.diagramType);
  const isRunning = useRef(false);

  // Chave de estrutura — apenas arestas estruturais (ignora sketch para não re-disparar layout)
  const structuralEdgeCount = visibleEdges.filter((e) => e.type !== "sketch").length;
  const structureKey = `${visibleNodes.length}|${structuralEdgeCount}|${useMindMapStore.getState().collapsedIds.size}`;

  const runLayout = useCallback(async () => {
    const nodes = getNodes();
    if (isRunning.current || nodes.length === 0) return;
    isRunning.current = true;

    try {
      const root = nodes.find((n) => (n.data as any).isRoot);
      if (!root) return;

      // ─── Layout DOWN para orgchart/flowchart ────────────────────────────────
      // Sketch edges are visual-only drafts — exclude from layout computation
      const layoutEdges = visibleEdges.filter((e) => e.type !== "sketch");

      if (diagramType === "orgchart" || diagramType === "flowchart") {
        const downGraph = {
          id: "down",
          layoutOptions: elkOptionsDown(),
          children: nodes.map((n) => ({
            id: n.id,
            width: (n as any).measured?.width ?? 150,
            height: (n as any).measured?.height ?? 40,
          })),
          edges: layoutEdges.map((e) => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
          })),
        };

        const downResult = await elk.layout(downGraph);
        const positionMap = new Map<string, { x: number; y: number }>();
        downResult.children?.forEach((n) => {
          positionMap.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
        });

        setNodes(
          nodes.map((node) => {
            const pos = positionMap.get(node.id);
            if (!pos) return node;
            return { ...node, position: pos };
          })
        );

        setTimeout(() => {
          fitView({ duration: 500, padding: 0.15 });
        }, 80);
        return;
      }

      // ─── Layout bifurcado LEFT/RIGHT para mindmap ───────────────────────────

      // Separar nós por lado
      const rightNodes = nodes.filter(
        (n) => n.id === root.id || (n.data as any).side === "right" || !(n.data as any).side
      );
      const leftNodes = nodes.filter((n) => (n.data as any).side === "left");

      const rightNodeIds = new Set(rightNodes.map((n) => n.id));
      const leftNodeIds = new Set([root.id, ...leftNodes.map((n) => n.id)]);

      const rightEdges = layoutEdges.filter(
        (e) => rightNodeIds.has(e.source) && rightNodeIds.has(e.target)
      );
      const leftEdges = layoutEdges.filter(
        (e) => leftNodeIds.has(e.source) && leftNodeIds.has(e.target)
      );

      // ─── Layout RIGHT ───────────────────────────────────────────────────────
      const rightGraph = {
        id: "right",
        layoutOptions: elkOptions("RIGHT"),
        children: rightNodes.map((n) => ({
          id: n.id,
          width: (n as any).measured?.width ?? 150,
          height: (n as any).measured?.height ?? 40,
        })),
        edges: rightEdges.map((e) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      const rightResult = await elk.layout(rightGraph);
      const rootInRight = rightResult.children?.find((c) => c.id === root.id);

      // ─── Layout LEFT ────────────────────────────────────────────────────────
      const leftWithRoot = [root, ...leftNodes];
      const leftGraph = {
        id: "left",
        layoutOptions: elkOptions("LEFT"),
        children: leftWithRoot.map((n) => ({
          id: n.id,
          width: (n as any).measured?.width ?? 150,
          height: (n as any).measured?.height ?? 40,
        })),
        edges: leftEdges.map((e) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      const leftResult = leftNodes.length > 0 ? await elk.layout(leftGraph) : null;
      const rootInLeft = leftResult?.children?.find((c) => c.id === root.id);

      // ─── Calcular offsets para unir os dois grafos pela raiz ────────────────
      const rootRightX = rootInRight?.x ?? 0;
      const rootRightY = rootInRight?.y ?? 0;

      // Offset para posicionar lado esquerdo espelhado
      const leftOffsetX = rootRightX - (rootInLeft?.x ?? 0);
      const leftOffsetY = rootRightY - (rootInLeft?.y ?? 0);

      // ─── Mapear posições finais ──────────────────────────────────────────────
      const positionMap = new Map<string, { x: number; y: number }>();

      rightResult.children?.forEach((n) => {
        positionMap.set(n.id, {
          x: n.x ?? 0,
          y: n.y ?? 0,
        });
      });

      leftResult?.children?.forEach((n) => {
        if (n.id !== root.id) {
          // Lado esquerdo: espelhar X em relação à raiz
          positionMap.set(n.id, {
            x: (n.x ?? 0) + leftOffsetX,
            y: (n.y ?? 0) + leftOffsetY,
          });
        }
      });

      // ─── Aplicar via ReactFlow (canal correto) ───────────────────────────────
      setNodes(
        nodes.map((node) => {
          const pos = positionMap.get(node.id);
          if (!pos) return node;
          return { ...node, position: pos };
        })
      );

      // fitView com animação suave após layout
      setTimeout(() => {
        fitView({ duration: 500, padding: 0.15 });
      }, 80);
    } catch (err) {
      console.error("[ELK Bifurcado]", err);
    } finally {
      isRunning.current = false;
    }
  }, [getNodes, setNodes, fitView, visibleEdges, diagramType]);

  // Gatilho: nós renderizados E estrutura mudou
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (nodesInitialized) {
      runLayout();
    }
  }, [nodesInitialized, structureKey]); // structureKey detecta collapse/expand/add/remove

  return { runLayout };
}
