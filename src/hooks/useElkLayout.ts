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
    // Espaço horizontal entre camadas — reduzido para layout mais compacto
    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    // Espaço vertical entre irmãos — bem compacto como no print de referência
    "elk.spacing.nodeNode": "14",
    // BRANDES_KOEPF + BALANCED: centra filhos ao redor do pai
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    // LAYER_SWEEP minimiza cruzamentos sem descentrar os nós
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    // Compactação pós-layout: reduz comprimento das arestas
    "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
    "elk.edgeRouting": "SPLINES",
    "elk.padding": "[top=10, left=10, bottom=10, right=10]",
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
  const diagramType = useMindMapStore((s) => s.diagramType);
  const layoutDirection = useMindMapStore((s) => s.layoutDirection);
  const isRunning = useRef(false);
  // fitView só na carga inicial — edições não devem fazer zoom-out
  const hasInitialFit = useRef(false);
  // Tracks the last structureKey that triggered a layout.
  // null = layout has never run (triggers the very first run).
  // Using a ref (not state) prevents extra renders.
  const lastLayoutKey = useRef<string | null>(null);

  // Chave de estrutura — apenas arestas estruturais (ignora sketch para não re-disparar layout)
  // Para orgchart/flowchart, inclui labelVersion para re-layoutar quando texto muda de tamanho
  // Also includes a shape fingerprint so re-layout fires when a node shape changes
  // (e.g. rectangle → diamond changes the measured size, requiring ELK to reposition)
  const isFlowLayout = diagramType === "orgchart" || diagramType === "flowchart";
  // Relayout só em: carga inicial, colapso/expansão, ou mudança de direção.
  // NÃO relayouta ao adicionar/mover nós — o usuário controla a posição manualmente.
  const collapseKey = useMindMapStore.getState().collapsedIds.size;
  const structureKey = `${collapseKey}|${layoutDirection}|${diagramType}`;

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

        // Anchor: keep root at its current position, shift everything else
        const elkRootPos = positionMap.get(root.id);
        const currentRootPos = root.position;
        const offsetX = elkRootPos ? currentRootPos.x - elkRootPos.x : 0;
        const offsetY = elkRootPos ? currentRootPos.y - elkRootPos.y : 0;

        const positionedNodes = nodes.map((node) => {
          const pos = positionMap.get(node.id);
          if (!pos) return node;
          return { ...node, position: { x: pos.x + offsetX, y: pos.y + offsetY } };
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

        if (!hasInitialFit.current) {
          hasInitialFit.current = true;
          setTimeout(() => { fitView({ duration: 500, padding: 0.15 }); }, 80);
        }
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

      // ─── Anchor root at its current position ─────────────────────────────────
      const elkRootX = rootInRight?.x ?? 0;
      const elkRootY = rootInRight?.y ?? 0;
      // Offset: shift ELK output so root stays where it was on screen
      const anchorOX = root.position.x - elkRootX;
      const anchorOY = root.position.y - elkRootY;

      // Offset para posicionar lado esquerdo espelhado (relative to ELK root)
      const leftOffsetX = elkRootX - (rootInLeft?.x ?? 0);
      const leftOffsetY = elkRootY - (rootInLeft?.y ?? 0);

      // ─── Mapear posições finais ──────────────────────────────────────────────
      const positionMap = new Map<string, { x: number; y: number }>();

      rightResult.children?.forEach((n) => {
        positionMap.set(n.id, {
          x: (n.x ?? 0) + anchorOX,
          y: (n.y ?? 0) + anchorOY,
        });
      });

      leftResult?.children?.forEach((n) => {
        if (n.id !== root.id) {
          positionMap.set(n.id, {
            x: (n.x ?? 0) + leftOffsetX + anchorOX,
            y: (n.y ?? 0) + leftOffsetY + anchorOY,
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

      // fitView apenas na carga inicial — sem zoom-out a cada edição
      if (!hasInitialFit.current) {
        hasInitialFit.current = true;
        setTimeout(() => {
          fitView({ duration: 500, padding: 0.15 });
        }, 80);
      }
    } catch (err) {
      console.error("[ELK Bifurcado]", err);
    } finally {
      isRunning.current = false;
    }
  }, [getNodes, setNodes, fitView, visibleEdges, diagramType, layoutDirection]);

  // Reset flags when diagram type changes (new diagram loaded)
  useEffect(() => {
    hasInitialFit.current = false;
    lastLayoutKey.current = null; // force re-layout on new diagram
  }, [diagramType]);

  // Trigger layout only when:
  //   (a) first time nodes are initialized (initial load), OR
  //   (b) structureKey actually changed (collapse/expand, direction, diagram type)
  //
  // Deliberately NOT re-running when nodesInitialized cycles true→false→true due to
  // a newly added node being measured — that would reposition manually-placed nodes.
  useEffect(() => {
    if (!nodesInitialized) return;
    const shouldRun = lastLayoutKey.current === null || lastLayoutKey.current !== structureKey;
    if (shouldRun) {
      lastLayoutKey.current = structureKey;
      runLayout();
    }
  }, [nodesInitialized, structureKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { runLayout };
}
