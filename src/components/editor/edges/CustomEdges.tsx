import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
  useInternalNode,
  MarkerType,
  type EdgeProps,
} from "@xyflow/react";


// ── Animated edge CSS keyframes ───────────────────────────

const animationDefs = `
  @keyframes edgeDashFlow {
    to { stroke-dashoffset: -24; }
  }
  @keyframes edgePulse {
    0%, 100% { opacity: 0.5; stroke-width: 1.5; }
    50% { opacity: 1; stroke-width: 3; }
  }
  @keyframes edgeGlow {
    0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
    50% { filter: drop-shadow(0 0 8px currentColor); }
  }
  @keyframes edgeNeon {
    0%, 100% {
      filter: drop-shadow(0 0 3px currentColor) drop-shadow(0 0 6px currentColor);
      opacity: 0.85;
    }
    50% {
      filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 14px currentColor) drop-shadow(0 0 20px currentColor);
      opacity: 1;
    }
  }
`;

let defsInjected = false;
function ensureDefs() {
  if (defsInjected) return;
  defsInjected = true;
  const style = document.createElement("style");
  style.textContent = animationDefs;
  document.head.appendChild(style);
}

function getAnimationStyle(style: React.CSSProperties | undefined): React.CSSProperties {
  ensureDefs();
  const anim = (style as any)?._animation as string | undefined;
  const dashArray = (style as any)?._dashArray as string | undefined;

  const base: React.CSSProperties = { ...style };
  delete (base as any)._animation;
  delete (base as any)._dashArray;

  switch (anim) {
    case "dash":
      return { ...base, strokeDasharray: dashArray || "6 3", animation: "edgeDashFlow 0.8s linear infinite" };
    case "flow":
      return { ...base, strokeDasharray: dashArray || "8 4", animation: "edgeDashFlow 1.5s linear infinite" };
    case "pulse":
      return { ...base, animation: "edgePulse 2s ease-in-out infinite" };
    case "glow":
      return { ...base, animation: "edgeGlow 2.5s ease-in-out infinite" };
    case "neon":
      return { ...base, animation: "edgeNeon 2s ease-in-out infinite" };
    default:
      return base;
  }
}

// ── Floating Edge Utilities ───────────────────────────────────────────────────
type InternalNodeLike = {
  internals: {
    positionAbsolute: { x: number; y: number };
  };
  measured?: { width?: number; height?: number };
};

/**
 * Calcula o ponto de interseção no border de `node` olhando em direção a `targetNode`.
 * Usado apenas para o TARGET (filho).
 */
function getNodeIntersection(node: InternalNodeLike, targetNode: InternalNodeLike) {
  const { positionAbsolute } = node.internals;
  const targetPos = targetNode.internals.positionAbsolute;

  const w = (node.measured?.width ?? 150) / 2;
  const h = (node.measured?.height ?? 40) / 2;
  const cx = positionAbsolute.x + w;
  const cy = positionAbsolute.y + h;
  const tx = targetPos.x + (targetNode.measured?.width ?? 150) / 2;
  const ty = targetPos.y + (targetNode.measured?.height ?? 40) / 2;

  const xx1 = (tx - cx) / (2 * w) - (ty - cy) / (2 * h);
  const yy1 = (tx - cx) / (2 * w) + (ty - cy) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return {
    x: w * (xx3 + yy3) + cx,
    y: h * (-xx3 + yy3) + cy,
  };
}

/**
 * SOURCE: centro fixo da borda do lado do branch no nó PAI.
 * TARGET: centro fixo da borda OPOSTA no nó FILHO.
 *
 * Ambos os pontos correspondem exatamente à posição do ReactFlow Handle
 * (center of left/right edge), garantindo conexão pixel-perfect.
 */
function getEdgeParams(
  source: InternalNodeLike,
  target: InternalNodeLike,
  sourceSide: "left" | "right"
) {
  const srcPos = source.internals.positionAbsolute;
  const srcW = source.measured?.width ?? 150;
  const srcH = source.measured?.height ?? 40;

  // SOURCE: centro da borda do lado de saída (mesmo ponto para todos os filhos)
  const sx = sourceSide === "right" ? srcPos.x + srcW : srcPos.x;
  const sy = srcPos.y + srcH / 2;
  const sourcePosition = sourceSide === "right" ? Position.Right : Position.Left;

  // TARGET: centro da borda oposta (exatamente onde o handle "t-in" fica)
  const tgtPos = target.internals.positionAbsolute;
  const tgtW = target.measured?.width ?? 150;
  const tgtH = target.measured?.height ?? 40;

  const tx = sourceSide === "right" ? tgtPos.x : tgtPos.x + tgtW;
  const ty = tgtPos.y + tgtH / 2;
  const targetPosition = sourceSide === "right" ? Position.Left : Position.Right;

  return { sx, sy, sourcePosition, tx, ty, targetPosition };
}


// ── Mind Map Edge (Source fixo + Target flutuante) ────────────────────────────

function MindMapEdgeComponent(props: EdgeProps) {
  const { id, source, target, style, data } = props;

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode?.internals || !targetNode?.internals) return null;

  // Determinar de qual lado o PAI emite a aresta.
  // Prioridade: data.side (edge) → data.side (target node) → fallback por posição X
  const childSide =
    ((data as any)?.side as "left" | "right" | undefined) ??
    ((targetNode as any).data?.side as "left" | "right" | undefined);

  let sourceSide: "left" | "right";
  if (childSide) {
    sourceSide = childSide;
  } else {
    // Fallback posicional — usado apenas na raiz sem side definido
    const srcCX = sourceNode.internals.positionAbsolute.x + (sourceNode.measured?.width ?? 150) / 2;
    const tgtCX = targetNode.internals.positionAbsolute.x + (targetNode.measured?.width ?? 150) / 2;
    sourceSide = tgtCX > srcCX ? "right" : "left";
  }

  const { sx, sy, tx, ty, sourcePosition, targetPosition } = getEdgeParams(
    sourceNode as unknown as InternalNodeLike,
    targetNode as unknown as InternalNodeLike,
    sourceSide
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
    curvature: 0.35,
  });

  const branchColor =
    ((data as any)?.branchColor as string | undefined) ??
    (style?.stroke as string | undefined) ??
    "#94a3b8";

  // Extrai animações do tema (_animation, _dashArray) — mesmo mecanismo
  // dos outros edge types, agora aplicado nativamente ao MindMapEdge
  const animStyle = getAnimationStyle(style);

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={branchColor}
      strokeWidth={2}
      strokeLinecap="round"
      style={{
        // currentColor resolve para branchColor nos keyframes de glow/neon
        color: branchColor,
        strokeDasharray: animStyle.strokeDasharray as string | undefined,
        animation: animStyle.animation as string | undefined,
        filter: (animStyle as any).filter as string | undefined,
        transition: "d 0.25s cubic-bezier(0.4,0,0.2,1), stroke 0.2s ease",
      }}
    />
  );
}
export const MindMapEdge = memo(MindMapEdgeComponent);

// ── Curved (Bezier) Edge ──────────────────────────────────

function CurvedEdgeComponent(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
  });
  return <BaseEdge id={props.id} path={edgePath} style={getAnimationStyle(props.style)} markerEnd={props.markerEnd} />;
}
export const CurvedEdge = memo(CurvedEdgeComponent);

// ── Animated SmoothStep Edge (default with animations) ────

function AnimatedSmoothStepEdgeComponent(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
    borderRadius: 6,
  });
  return <BaseEdge id={props.id} path={edgePath} style={getAnimationStyle(props.style)} markerEnd={props.markerEnd} />;
}
export const AnimatedSmoothStepEdge = memo(AnimatedSmoothStepEdgeComponent);

// ── Orthogonal (SmoothStep) Edge ──────────────────────────

function OrthogonalEdgeComponent(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
    borderRadius: 8,
  });
  return <BaseEdge id={props.id} path={edgePath} style={getAnimationStyle(props.style)} markerEnd={props.markerEnd} />;
}
export const OrthogonalEdge = memo(OrthogonalEdgeComponent);

// ── Straight Edge ─────────────────────────────────────────

function StraightEdgeComponent(props: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    targetX: props.targetX, targetY: props.targetY,
  });
  return <BaseEdge id={props.id} path={edgePath} style={getAnimationStyle(props.style)} markerEnd={props.markerEnd} />;
}
export const StraightEdge = memo(StraightEdgeComponent);

// ── Hierarchy Edge (curved L-shape for org charts) ────────

function HierarchyEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY } = props;
  const midY = sourceY + (targetY - sourceY) * 0.5;
  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
  return <BaseEdge id={props.id} path={edgePath} style={getAnimationStyle(props.style)} markerEnd={props.markerEnd} />;
}
export const HierarchyEdge = memo(HierarchyEdgeComponent);

// ── Straight Mind Map Edge (Straight + interactive collapse circle) ──────

function StraightMindMapEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, style } = props;

  const [edgePath] = getStraightPath({
    sourceX, sourceY,
    targetX, targetY,
  });

  const edgeStyle = getAnimationStyle(style);

  return (
    <g>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={props.markerEnd} />
    </g>
  );
}
export const StraightMindMapEdge = memo(StraightMindMapEdgeComponent);

// ── Square Mind Map Edge (Orthogonal + interactive collapse circle) ──────

function SquareMindMapEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 0, // Perfectly square as requested
  });

  const edgeStyle = getAnimationStyle(style);

  return (
    <g>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={props.markerEnd} />
    </g>
  );
}
export const SquareMindMapEdge = memo(SquareMindMapEdgeComponent);

// ── Sketch Edge (manual connector — dashed + arrow, hand-drawn feel) ─────────
// Used for user-created cross-links. Uses BaseEdge with a dashed stroke and
// React Flow's built-in marker for the arrowhead (avoids SVG defs-in-g issues).

function SketchEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, selected } = props;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature: 0.25,
  });

  const color = (style as any)?.stroke || "#6b7280";
  const strokeWidth = selected ? 2 : 1.5;

  const edgeStyle: React.CSSProperties = {
    stroke: color,
    strokeWidth,
    strokeDasharray: "7 4",
    strokeLinecap: "round",
    opacity: selected ? 1 : 0.8,
    transition: "opacity 0.15s ease, stroke-width 0.15s ease",
  };

  return (
    <g>
      {/* Wide invisible hit area so the dashed line is easy to click/select */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={14} />

      {/* Visible dashed line — BaseEdge handles the markerEnd SVG injection via React Flow */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={props.markerEnd}
      />

      {/* Fallback arrowhead using a small inline triangle at the end of the path */}
      <defs>
        <marker
          id={`sketch-arrow-${id}`}
          viewBox="0 -4 8 8"
          refX="7"
          refY="0"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <polyline points="0,-3.5 8,0 0,3.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </marker>
      </defs>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={0}
        markerEnd={`url(#sketch-arrow-${id})`}
      />
    </g>
  );
}
export const SketchEdge = memo(SketchEdgeComponent);

// ── Flow Edge (SmoothStep with arrowhead — for orgchart/flowchart) ────────────

function FlowEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 6,
  });

  const branchColor =
    ((data as any)?.branchColor as string | undefined) ??
    (style?.stroke as string | undefined) ??
    "#94a3b8";

  const animStyle = getAnimationStyle(style);

  return (
    <g>
      <defs>
        <marker
          id={`flow-arrow-${id}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="16"
          markerHeight="16"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={branchColor} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...animStyle,
          stroke: branchColor,
          strokeWidth: 2,
        }}
        markerEnd={`url(#flow-arrow-${id})`}
      />
    </g>
  );
}
export const FlowEdge = memo(FlowEdgeComponent);
