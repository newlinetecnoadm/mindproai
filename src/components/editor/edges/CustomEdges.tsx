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

// ── Mind Map Edge (Bezier + interactive collapse circle) ─────────────

const CIRCLE_R = 6; // radius of the collapse circle in px

function MindMapEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature: 0.12,
  });

  const branchColor = (data as any)?.branchColor as string | undefined;
  const isCollapseEdge = (data as any)?.isCollapseEdge as boolean | undefined;
  const isCollapsed = (data as any)?.isCollapsed as boolean | undefined;
  const sourceNodeId = (data as any)?.sourceNodeId as string | undefined;
  const edgeStyle = getAnimationStyle(style);
  const strokeColor = branchColor ?? "#6B7280";

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Stop native event propagation to prevent React Flow's capture-phase handlers
    e.nativeEvent.stopImmediatePropagation();
    if (sourceNodeId) {
      window.dispatchEvent(
        new CustomEvent("mindmap-toggle-collapse", { detail: { nodeId: sourceNodeId } })
      );
    }
  };

  return (
    <g>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={props.markerEnd} />
    </g>
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
