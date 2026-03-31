import React, { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useUserRole } from "../editor/UserRoleContext";

export type MindMapNodeData = {
  label: string;
  color?: string;
  branchHex?: string;
  depth?: number;
  isRoot?: boolean;
  showHandles?: boolean;
};

import { BRAND_GRAY } from "@/lib/nodeStyles";

function MindMapNode({ data, id, selected }: NodeProps & { data: MindMapNodeData }) {
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
    if (e.key === "Enter") {
      setEditing(false);
      window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } }));
    }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  const isRoot = data.isRoot;
  const depth = data.depth ?? 0;
  const side = (data as any).side as "left" | "right" | undefined;

  // Colors and typography follow the pre-calculated style in data
  const style = (data as any).style || {};
  const isFilled = style.background && style.background !== 'transparent' && style.background !== 'none';
  const isDark = !!(data as any).isDark;
  
  // Use pre-calculated color from style, or fallback based on filled status/theme darkness
  const textColor = style.color || (isFilled ? "#ffffff" : (isDark ? "#f0f0f0" : BRAND_GRAY));

  const fontSize = style.fontSize ?? (isRoot ? "1.2rem" : depth === 1 ? "0.9375rem" : "0.875rem");
  const fontWeight = style.fontWeight ?? (isRoot ? "700" : "400");

  // Text alignment: left-side nodes → right-aligned (reads toward root)
  //                 right-side nodes → left-aligned (reads away from root)
  //                 root → centered
  const textAlign: "left" | "right" | "center" =
    isRoot ? "center" : side === "left" ? "right" : "left";

  // Container justification mirrors text alignment
  const justifyContent =
    isRoot ? "center" : side === "left" ? "flex-end" : "flex-start";




  return (
    <div
      className="group relative"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent,
        whiteSpace: "nowrap",
        width: "100%",
        height: "100%",
        cursor: "text",
        userSelect: "none",
        ...style,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Handles: always connectable, visually hidden until showHandles=true */}
      {(["Top","Bottom","Left","Right"] as const).map((pos) => {
        const position = Position[pos];
        // Always keep handles interactable so connection dragging works.
        // Only change opacity for visual feedback — pointer events must remain active.
        const handleStyle: React.CSSProperties = data.showHandles
          ? {
              opacity: 1,
              width: 10,
              height: 10,
              background: "rgba(100,100,100,0.35)",
              border: "none",
              borderRadius: "50%",
              cursor: "crosshair",
              transition: "opacity 0.15s ease",
            }
          : {
              opacity: 0,
              width: 8,
              height: 8,
              transition: "opacity 0.15s ease",
            };
        return (
          <React.Fragment key={pos}>
            <Handle type="source" position={position} id={pos.toLowerCase()} style={handleStyle} />
            <Handle type="target" position={position} id={pos.toLowerCase()} style={handleStyle} />
          </React.Fragment>
        );
      })}

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
            textAlign,
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
              textAlign,
              display: "block",
              width: "100%",
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
            [(data as any).side === "left" ? "left" : "right"]: isFilled ? -14 : -10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: `1.5px solid ${data.branchHex || "#e5e7eb"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
                backgroundColor: data.branchHex || "#6b7280" 
              }} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(MindMapNode);
