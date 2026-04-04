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
    // Maior = mais distância horizontal, criando o "leque" do mapa mental
    "elk.layered.spacing.nodeNodeBetweenLayers": "120",
    // Espaço vertical entre irmãos — deve ser grande o bastante para sub-árvores não sobreporem
    "elk.spacing.nodeNode": "34",
    // CENTER: filhos centrados verticalmente ao redor do pai (resolve número ímpar)
    "elk.layered.nodePlacement.strategy": "SIMPLE",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.alignment": "CENTER",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "SPLINES",
    "elk.padding": "[top=20, left=20, bottom=20, right=20]",
  };
}


// ─── Hook ────────────────────────────────────────────────────────────────────

export function useElkLayout() {
  const { getNodes, setNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const visibleEdges = useMindMapStore((s) => s.visibleEdges);
  const visibleNodes = useMindMapStore((s) => s.visibleNodes);
  const isRunning = useRef(false);

  // Chave de estrutura — muda quando collapse/expand ou nós são adicionados/removidos
  const structureKey = `${visibleNodes.length}|${visibleEdges.length}|${useMindMapStore.getState().collapsedIds.size}`;

  const runLayout = useCallback(async () => {
    const nodes = getNodes();
    if (isRunning.current || nodes.length === 0) return;
    isRunning.current = true;

    try {
      const root = nodes.find((n) => (n.data as any).isRoot);
      if (!root) return;

      // Separar nós por lado
      const rightNodes = nodes.filter(
        (n) => n.id === root.id || (n.data as any).side === "right" || !(n.data as any).side
      );
      const leftNodes = nodes.filter((n) => (n.data as any).side === "left");

      const rightNodeIds = new Set(rightNodes.map((n) => n.id));
      const leftNodeIds = new Set([root.id, ...leftNodes.map((n) => n.id)]);

      const rightEdges = visibleEdges.filter(
        (e) => rightNodeIds.has(e.source) && rightNodeIds.has(e.target)
      );
      const leftEdges = visibleEdges.filter(
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
  }, [getNodes, setNodes, fitView, visibleEdges]);

  // Gatilho: nós renderizados E estrutura mudou
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (nodesInitialized) {
      runLayout();
    }
  }, [nodesInitialized, structureKey]); // structureKey detecta collapse/expand/add/remove

  return { runLayout };
}
