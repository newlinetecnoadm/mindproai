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


// Opções ELK para layout de fluxo (orgchart/flowchart) — suporta DOWN e RIGHT
function elkOptionsFlow(direction: "DOWN" | "RIGHT" = "DOWN") {
  return {
    "elk.algorithm": "layered",
    "elk.direction": direction,
    // Espaçamento entre camadas (vertical=entre linhas, horizontal=entre colunas)
    "elk.layered.spacing.nodeNodeBetweenLayers": "90",
    // Espaçamento entre irmãos — aumentado para caber o diamante
    "elk.spacing.nodeNode": "70",
    // Distância entre arestas e nós adjacentes — evita linhas grudadas
    "elk.layered.spacing.edgeNodeBetweenLayers": "30",
    "elk.spacing.edgeNode": "20",
    "elk.spacing.edgeEdge": "15",
    // BRANDES_KOEPF + BALANCED centraliza filhos sob o pai
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    // ORTHOGONAL routing → arestas em linhas retas com elbows, lida
    // naturalmente com arestas convergentes (duas setas para o mesmo nó)
    "elk.edgeRouting": "ORTHOGONAL",
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
  const layoutDirection = useMindMapStore((s) => s.layoutDirection);
  const labelVersion = useMindMapStore((s) => s.labelVersion);
  const isRunning = useRef(false);

  // Chave de estrutura — apenas arestas estruturais (ignora sketch para não re-disparar layout)
  // Para orgchart/flowchart, inclui labelVersion para re-layoutar quando texto muda de tamanho
  // Also includes a shape fingerprint so re-layout fires when a node shape changes
  // (e.g. rectangle → diamond changes the measured size, requiring ELK to reposition)
  const structuralEdgeCount = visibleEdges.filter((e) => e.type !== "sketch").length;
  const isFlowLayout = diagramType === "orgchart" || diagramType === "flowchart";
  const shapeKey = isFlowLayout
    ? visibleNodes.map((n) => (n.data as any)?.shape ?? "").join(",")
    : "";
  const structureKey = `${visibleNodes.length}|${structuralEdgeCount}|${useMindMapStore.getState().collapsedIds.size}|${isFlowLayout ? labelVersion : 0}|${shapeKey}|${layoutDirection}`;

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
        const dir = useMindMapStore.getState().layoutDirection;
        const flowGraph = {
          id: "flow",
          layoutOptions: elkOptionsFlow(dir),
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

        const downResult = await elk.layout(flowGraph);
        const positionMap = new Map<string, { x: number; y: number }>();
        downResult.children?.forEach((n) => {
          positionMap.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
        });

        const positionedNodes = nodes.map((node) => {
          const pos = positionMap.get(node.id);
          return pos ? { ...node, position: pos } : node;
        });

        // Migrate legacy "mindmap" edges → "flow" so they render as straight orthogonal connectors
        // Must update the store directly (not setEdges) because ReactFlow is in controlled mode
        // Handle IDs depend on direction: DOWN → bottom/top, RIGHT → right/left
        const store = useMindMapStore.getState();
        const currentEdges = store.visibleEdges;
        const srcHandle = dir === "RIGHT" ? "s-right" : "s-bottom";
        const tgtHandle = dir === "RIGHT" ? "t-left" : "t-top";
        const hasLegacyEdges = currentEdges.some((e) => e.type !== "sketch" && e.type !== "flow");
        // Also detect handle mismatch when direction changes
        const hasHandleMismatch = currentEdges.some((e) =>
          e.type === "flow" && (e.sourceHandle !== srcHandle || e.targetHandle !== tgtHandle)
        );
        if (hasLegacyEdges || hasHandleMismatch) {
          const migratedEdges = currentEdges.map((e) =>
            e.type === "sketch" ? e : { ...e, type: "flow", sourceHandle: srcHandle, targetHandle: tgtHandle }
          );
          const migratedAllEdges = store.allEdges.map((e) =>
            e.type === "sketch" ? e : { ...e, type: "flow", sourceHandle: srcHandle, targetHandle: tgtHandle }
          );
          // Update both visibleNodes (with positions) + edges in a single store update
          store.setVisible(positionedNodes as any, migratedEdges);
          useMindMapStore.setState({ allEdges: migratedAllEdges });
        } else {
          setNodes(positionedNodes);
        }

        setTimeout(() => { fitView({ duration: 500, padding: 0.15 }); }, 80);
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
  }, [getNodes, setNodes, fitView, visibleEdges, diagramType, layoutDirection]);

  // Gatilho: nós renderizados E estrutura mudou
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (nodesInitialized) {
      runLayout();
    }
  }, [nodesInitialized, structureKey]); // structureKey detecta collapse/expand/add/remove

  return { runLayout };
}
