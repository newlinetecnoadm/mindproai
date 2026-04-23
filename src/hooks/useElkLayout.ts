import { useCallback, useEffect, useRef } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useReactFlow, useNodesInitialized } from "@xyflow/react";
import { useMindMapStore } from "@/store/useMindMapStore";

// Singleton ELK — usado apenas para orgchart/flowchart
const elk = new ELK();

// ─── Opções ELK para layout de fluxo (orgchart/flowchart) ────────────────────
function elkOptionsFlow(direction: "DOWN" | "RIGHT" = "DOWN") {
  return {
    "elk.algorithm": "layered",
    "elk.direction": direction,
    "elk.layered.spacing.nodeNodeBetweenLayers": "90",
    "elk.spacing.nodeNode": "70",
    "elk.layered.spacing.edgeNodeBetweenLayers": "30",
    "elk.spacing.edgeNode": "20",
    "elk.spacing.edgeEdge": "15",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.padding": "[top=40, left=60, bottom=40, right=60]",
  };
}

// ─── Layout de árvore personalizado para mindmap ──────────────────────────────
//
// Implementação Reingold-Tilford simplificada:
//   1. Calcula altura do sub-grafo de cada nó (bottom-up)
//   2. Posiciona filhos centralizados verticalmente no pai (top-down)
//
// Garante: espaçamento uniforme, filhos sempre centrados no pai, sem ELK.

const MM_H_GAP = 70; // gap horizontal entre borda direita do pai e borda esquerda do filho
const MM_V_GAP = 12; // gap vertical entre sub-árvores irmãs

/** Altura total da sub-árvore enraizada em nodeId. */
function mmSubtreeHeight(
  nodeId: string,
  childrenMap: Map<string, string[]>,
  sizeMap: Map<string, { w: number; h: number }>
): number {
  const { h } = sizeMap.get(nodeId) ?? { w: 150, h: 40 };
  const children = childrenMap.get(nodeId) ?? [];
  if (children.length === 0) return h;
  const childrenTotal =
    children.reduce((sum, c) => sum + mmSubtreeHeight(c, childrenMap, sizeMap), 0) +
    (children.length - 1) * MM_V_GAP;
  // Se o nó for mais alto que seus filhos (raro), usa a altura do nó
  return Math.max(h, childrenTotal);
}

/**
 * Posiciona recursivamente o nó e sua sub-árvore.
 *
 * @param x        Borda esquerda do nó atual (coordenadas React Flow)
 * @param centerY  Centro vertical da sub-árvore inteira (não só do nó)
 * @param direction 1 = crescendo para a direita, -1 = crescendo para a esquerda
 */
function mmPlace(
  nodeId: string,
  x: number,
  centerY: number,
  direction: 1 | -1,
  childrenMap: Map<string, string[]>,
  sizeMap: Map<string, { w: number; h: number }>,
  out: Map<string, { x: number; y: number }>
): void {
  const { w, h } = sizeMap.get(nodeId) ?? { w: 150, h: 40 };
  // O nó em si fica verticalmente centrado no centro da sub-árvore
  out.set(nodeId, { x, y: centerY - h / 2 });

  const children = childrenMap.get(nodeId) ?? [];
  if (!children.length) return;

  // Altura de cada sub-árvore filha
  const subtreeHeights = children.map((c) => mmSubtreeHeight(c, childrenMap, sizeMap));
  const totalH =
    subtreeHeights.reduce((a, b) => a + b, 0) + (children.length - 1) * MM_V_GAP;

  // Começa no topo do bloco de filhos
  let cy = centerY - totalH / 2;

  for (let i = 0; i < children.length; i++) {
    const childId = children[i];
    const { w: cw } = sizeMap.get(childId) ?? { w: 150, h: 40 };
    const childCenterY = cy + subtreeHeights[i] / 2;

    // Posição horizontal do filho:
    //   direita: pai.rightEdge + H_GAP
    //   esquerda: pai.leftEdge - H_GAP - childWidth
    const childX = direction === 1 ? x + w + MM_H_GAP : x - MM_H_GAP - cw;

    mmPlace(childId, childX, childCenterY, direction, childrenMap, sizeMap, out);
    cy += subtreeHeights[i] + MM_V_GAP;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useElkLayout() {
  const { getNodes, setNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const visibleEdges = useMindMapStore((s) => s.visibleEdges);
  const visibleNodes = useMindMapStore((s) => s.visibleNodes);
  const diagramType = useMindMapStore((s) => s.diagramType);
  const layoutDirection = useMindMapStore((s) => s.layoutDirection);

  const isRunning = useRef(false);
  const hasInitialFit = useRef(false);
  const lastLayoutKey = useRef<string | null>(null);

  // Fingerprint de arestas estruturais: detecta reparentar (source/target muda
  // mas count não muda) além de add/delete de nós.
  const edgeSig = visibleEdges
    .filter((e) => e.type !== "sketch")
    .map((e) => `${e.source}>${e.target}`)
    .sort()
    .join("|");
  const collapseKey = useMindMapStore.getState().collapsedIds.size;
  const nodeCount = visibleNodes.length;
  const structureKey = `${nodeCount}|${edgeSig}|${collapseKey}|${layoutDirection}|${diagramType}`;

  const runLayout = useCallback(async () => {
    const nodes = getNodes();
    if (isRunning.current || nodes.length === 0) return;
    isRunning.current = true;

    try {
      const root = nodes.find((n) => (n.data as any).isRoot);
      if (!root) return;

      const layoutEdges = visibleEdges.filter((e) => e.type !== "sketch");

      // ── Layout orgchart/flowchart (ELK) ──────────────────────────────────────
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

        const elkRootPos = positionMap.get(root.id);
        const currentRootPos = root.position;
        const offsetX = elkRootPos ? currentRootPos.x - elkRootPos.x : 0;
        const offsetY = elkRootPos ? currentRootPos.y - elkRootPos.y : 0;

        const positionedNodes = nodes.map((node) => {
          const pos = positionMap.get(node.id);
          if (!pos) return node;
          return { ...node, position: { x: pos.x + offsetX, y: pos.y + offsetY } };
        });

        const store = useMindMapStore.getState();
        const currentEdges = store.visibleEdges;
        const srcHandle = dir === "RIGHT" ? "s-right" : "s-bottom";
        const tgtHandle = dir === "RIGHT" ? "t-left" : "t-top";
        const hasLegacyEdges = currentEdges.some((e) => e.type !== "sketch" && e.type !== "flow");
        const hasHandleMismatch = currentEdges.some(
          (e) => e.type === "flow" && (e.sourceHandle !== srcHandle || e.targetHandle !== tgtHandle)
        );
        if (hasLegacyEdges || hasHandleMismatch) {
          const migratedEdges = currentEdges.map((e) =>
            e.type === "sketch" ? e : { ...e, type: "flow", sourceHandle: srcHandle, targetHandle: tgtHandle }
          );
          const migratedAllEdges = store.allEdges.map((e) =>
            e.type === "sketch" ? e : { ...e, type: "flow", sourceHandle: srcHandle, targetHandle: tgtHandle }
          );
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

      // ── Layout mindmap (árvore personalizada) ────────────────────────────────
      //
      // Usa o algoritmo Reingold-Tilford (mmPlace/mmSubtreeHeight) em vez de ELK.
      // Garante: filhos sempre centralizados no pai, espaçamento uniforme.

      const sizeMap = new Map(
        nodes.map((n) => [
          n.id,
          {
            w: (n as any).measured?.width ?? 150,
            h: (n as any).measured?.height ?? 40,
          },
        ])
      );

      // Mapa pai → filhos (apenas arestas estruturais)
      const childrenMap = new Map<string, string[]>();
      nodes.forEach((n) => childrenMap.set(n.id, []));

      // Mapeia nodeId → índice da aresta que o conecta ao pai.
      // Usar índice de aresta (ordem de criação) em vez de posição Y evita
      // dependência de posições obsoletas no store: novos irmãos vão sempre
      // ao final pois sua aresta é adicionada por último.
      const edgeOrderMap = new Map<string, number>();
      layoutEdges.forEach((e, idx) => {
        childrenMap.get(e.source)?.push(e.target);
        edgeOrderMap.set(e.target, idx);
      });

      for (const [, children] of childrenMap) {
        children.sort((a, b) => (edgeOrderMap.get(a) ?? 0) - (edgeOrderMap.get(b) ?? 0));
      }

      const rootSize = sizeMap.get(root.id) ?? { w: 150, h: 40 };
      const rootCenterY = root.position.y + rootSize.h / 2;

      const out = new Map<string, { x: number; y: number }>();
      out.set(root.id, root.position); // raiz ancorada

      const rootChildren = childrenMap.get(root.id) ?? [];
      const rightChildren = rootChildren.filter(
        (id) => (nodes.find((n) => n.id === id)?.data as any)?.side !== "left"
      );
      const leftChildren = rootChildren.filter(
        (id) => (nodes.find((n) => n.id === id)?.data as any)?.side === "left"
      );

      // Posiciona lado direito
      if (rightChildren.length > 0) {
        const heights = rightChildren.map((c) => mmSubtreeHeight(c, childrenMap, sizeMap));
        const totalH =
          heights.reduce((a, b) => a + b, 0) + (rightChildren.length - 1) * MM_V_GAP;
        let cy = rootCenterY - totalH / 2;
        const childX = root.position.x + rootSize.w + MM_H_GAP;
        for (let i = 0; i < rightChildren.length; i++) {
          mmPlace(rightChildren[i], childX, cy + heights[i] / 2, 1, childrenMap, sizeMap, out);
          cy += heights[i] + MM_V_GAP;
        }
      }

      // Posiciona lado esquerdo (espelhado)
      if (leftChildren.length > 0) {
        const heights = leftChildren.map((c) => mmSubtreeHeight(c, childrenMap, sizeMap));
        const totalH =
          heights.reduce((a, b) => a + b, 0) + (leftChildren.length - 1) * MM_V_GAP;
        let cy = rootCenterY - totalH / 2;
        for (let i = 0; i < leftChildren.length; i++) {
          const { w: cw } = sizeMap.get(leftChildren[i]) ?? { w: 150, h: 40 };
          const childX = root.position.x - MM_H_GAP - cw;
          mmPlace(leftChildren[i], childX, cy + heights[i] / 2, -1, childrenMap, sizeMap, out);
          cy += heights[i] + MM_V_GAP;
        }
      }

      const positionedNodes = nodes.map((node) => {
        const pos = out.get(node.id);
        if (!pos) return node;
        return { ...node, position: pos };
      });

      setNodes(positionedNodes);

      // Sincroniza posições de volta ao store para que addChild/addSibling
      // leiam posições corretas ao calcular lastBottom (evita inserção na ordem errada).
      const store = useMindMapStore.getState();
      const nextAllNodes = store.allNodes.map((n) => {
        const pos = out.get(n.id);
        return pos ? { ...n, position: pos } : n;
      });
      useMindMapStore.setState({ allNodes: nextAllNodes });

      if (!hasInitialFit.current) {
        hasInitialFit.current = true;
        setTimeout(() => { fitView({ duration: 500, padding: 0.15 }); }, 80);
      }
    } catch (err) {
      console.error("[Layout]", err);
    } finally {
      isRunning.current = false;
    }
  }, [getNodes, setNodes, fitView, visibleEdges, diagramType, layoutDirection]);

  // Reset ao trocar de diagrama
  useEffect(() => {
    hasInitialFit.current = false;
    lastLayoutKey.current = null;
  }, [diagramType]);

  // Dispara layout quando:
  //   (a) carga inicial (nodesInitialized = true pela primeira vez), OU
  //   (b) structureKey mudou (nó adicionado/removido, colapso, direção, tipo)
  //
  // Nunca re-executa quando nodesInitialized cicla true→false→true após um
  // repositionamento — lastLayoutKey impede a segunda execução.
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
