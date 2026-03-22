import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export type MindMapNodeData = {
  label: string;
  color?: string;
  branchHex?: string;
  depth?: number;
  isRoot?: boolean;
};

// Brand identity dark gray — used for non-filled node text
const BRAND_GRAY = "#3d3d3d";

function MindMapNode({ data, id }: NodeProps & { data: MindMapNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId === id) {
        if (detail?.replaceText) setLabel("");
        setEditing(true);
      }
    };
    window.addEventListener("mindmap-edit-node", handler);
    return () => window.removeEventListener("mindmap-edit-node", handler);
  }, [id]);

  const handleDoubleClick = () => setEditing(true);

  const handleBlur = () => {
    setEditing(false);
    data.label = label;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  const isRoot = data.isRoot;
  const depth = data.depth ?? 0;

  // Depth-1 nodes: filled pill with branch color + white text
  // All others: transparent background, brand gray text
  const isDepth1 = !isRoot && depth === 1;
  const fillColor = isDepth1 ? (data.branchHex ?? undefined) : undefined;
  const isDark = !!(data as any).isDark;
  // Filled nodes (depth-1) always white text; others adapt to theme darkness
  const textColor = fillColor ? "#ffffff" : isDark ? "#f0f0f0" : BRAND_GRAY;

  const fontSize = isRoot ? "1.2rem" : depth === 1 ? "0.9375rem" : "0.875rem";
  const fontWeight = isRoot ? "700" : "400";


  // Handles invisible — React Flow needs them for edge routing
  const handleStyle = "!w-2 !h-2 !bg-transparent !border-none !opacity-0";

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        // Depth-1: filled pill shape; others: plain
        ...(fillColor ? {
          backgroundColor: fillColor,
          borderRadius: "8px",
          padding: "6px 14px",
        } : {
          padding: "2px 6px",
          minWidth: 40,
        }),
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="source" position={Position.Top}    id="top"    className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Left}   id="left"   className={handleStyle} />
      <Handle type="source" position={Position.Right}  id="right"  className={handleStyle} />
      <Handle type="target" position={Position.Top}    id="top"    className={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="target" position={Position.Left}   id="left"   className={handleStyle} />
      <Handle type="target" position={Position.Right}  id="right"  className={handleStyle} />

      {editing ? (
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "transparent",
            outline: "none",
            border: "none",
            color: textColor,
            fontSize,
            fontWeight,
            fontFamily: "inherit",
            minWidth: "60px",
            width: `${Math.max(60, label.length * 9)}px`,
            padding: 0,
            lineHeight: "1.4",
          }}
        />
      ) : (
        <span
          style={{
            color: textColor,
            fontSize,
            fontWeight,
            lineHeight: "1.4",
            letterSpacing: "-0.01em",
            userSelect: "none",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default memo(MindMapNode);
