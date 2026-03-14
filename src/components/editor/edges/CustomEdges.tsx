import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
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

// ── Curved (Bezier) Edge ──────────────────────────────────

function CurvedEdgeComponent(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
  });
  return <BaseEdge id={props.id} path={edgePath} style={getAnimationStyle(props.style)} markerEnd={props.markerEnd} />;
}
export const CurvedEdge = memo(CurvedEdgeComponent);

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
