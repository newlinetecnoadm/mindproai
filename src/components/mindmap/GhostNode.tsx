import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

/**
 * GhostNode – rendered at the original position of a dragged node.
 * Shows a dashed placeholder outline so the user can see where the node came from.
 */
function GhostNode({ data }: NodeProps & { data: { width: number; height: number; label?: string } }) {
  const w = data.width ?? 120;
  const h = data.height ?? 28;

  return (
    <div
      style={{
        width: w,
        height: h,
        border: "2px dashed #E9853A",
        borderRadius: 6,
        opacity: 0.45,
        backgroundColor: "transparent",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "2px 8px",
        boxSizing: "border-box",
      }}
    >
      {data.label && (
        <span style={{ color: "#E9853A", fontSize: "0.875rem", userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.label}
        </span>
      )}
    </div>
  );
}

export default memo(GhostNode);
