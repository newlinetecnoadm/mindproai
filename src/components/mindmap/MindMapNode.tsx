import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useUserRole } from "../editor/UserRoleContext";

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
  const userRole = useUserRole();
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
    if (userRole === "viewer") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId === id) {
        if (detail?.replaceText) {
          setLabel(detail.char ?? "");
        }
        setEditing(true);
      }
    };
    window.addEventListener("mindmap-edit-node", handler);
    return () => window.removeEventListener("mindmap-edit-node", handler);
  }, [id, userRole]);

  const handleDoubleClick = () => {
    if (userRole !== "viewer") setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    // Final sync on blur
    window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLabel(newVal);
    // Sync to global state during typing so manual node additions (Tab/Enter) 
    // use the latest available text even before blur.
    window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: newVal } }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } })); }
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
          onChange={handleTextChange}
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
              textAlign: "center",
              display: "block",
            }}
          >
            {label}
          </span>
      )}

      {data.hasChildren && !isRoot && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("mindmap-toggle-collapse", { detail: { nodeId: id } }));
          }}
          className="collapse-button"
          style={{
            position: "absolute",
            [(data as any).side === "left" ? "left" : "right"]: -6,
            top: "50%",
            transform: "translateY(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: `1.5px solid ${fillColor || data.branchHex || "#e5e7eb"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            zIndex: 10,
            transition: "all 0.2s ease",
          }}
        >
          {data.isCollapsed && (
            <div 
              style={{ 
                width: 4, 
                height: 4, 
                borderRadius: "2px", 
                backgroundColor: fillColor || data.branchHex || "#6b7280" 
              }} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(MindMapNode);
