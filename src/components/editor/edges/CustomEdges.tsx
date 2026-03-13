import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

// ── Curved (Bezier) Edge ──────────────────────────────────

function CurvedEdgeComponent(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      style={props.style}
      markerEnd={props.markerEnd}
    />
  );
}

export const CurvedEdge = memo(CurvedEdgeComponent);

// ── Orthogonal (SmoothStep) Edge ──────────────────────────

function OrthogonalEdgeComponent(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      style={props.style}
      markerEnd={props.markerEnd}
    />
  );
}

export const OrthogonalEdge = memo(OrthogonalEdgeComponent);

// ── Straight Edge ─────────────────────────────────────────

function StraightEdgeComponent(props: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  });

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      style={props.style}
      markerEnd={props.markerEnd}
    />
  );
}

export const StraightEdge = memo(StraightEdgeComponent);

// ── Hierarchy Edge (curved L-shape for org charts) ────────

function HierarchyEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY } = props;
  const midY = sourceY + (targetY - sourceY) * 0.5;

  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      style={props.style}
      markerEnd={props.markerEnd}
    />
  );
}

export const HierarchyEdge = memo(HierarchyEdgeComponent);
