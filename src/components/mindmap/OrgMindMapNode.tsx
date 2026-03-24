import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useUserRole } from "../editor/UserRoleContext";

export type OrgMindMapNodeData = {
  label: string;
  subLabel?: string;
  color?: string;
  branchHex?: string;
  depth?: number;
  isRoot?: boolean;
};

// Brand identity dark gray — used for non-filled node text
const BRAND_GRAY = "#3d3d3d";

function OrgMindMapNode({ data, id }: NodeProps & { data: OrgMindMapNodeData }) {
  const userRole = useUserRole();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [subLabel, setSubLabel] = useState(data.subLabel || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (!editing && containerRef.current) {
      // Return focus to the node container to allow Tab/Enter shortcuts
      // Delay slightly to ensure the input is unmounted
      setTimeout(() => {
        const nodeEl = containerRef.current?.closest(".react-flow__node") as HTMLElement;
        if (nodeEl) nodeEl.focus();
      }, 10);
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
    window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "subLabel", value: subLabel } }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLabel(newVal);
    window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: newVal } }));
  };

  const handleSubTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSubLabel(newVal);
    window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "subLabel", value: newVal } }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } }));
      window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "subLabel", value: subLabel } }));
    }
    if (e.key === "Escape") {
      setLabel(data.label);
      setSubLabel(data.subLabel || "");
      setEditing(false);
    }
  };

  const isRoot = data.isRoot;
  const depth = data.depth ?? 0;

  // Org Chart nodes: filled square with branch color + white text (depth 1)
  // All others: transparent background, but in Org Chart we often want a border or some structure.
  // HOWEVER, user requested "nó raiz sem contorno" (like mindmap root).
  
  const isDepth1 = !isRoot && depth === 1;
  const fillColor = isDepth1 ? (data.branchHex ?? undefined) : undefined;
  const isDark = !!(data as any).isDark;
  const textColor = fillColor ? "#ffffff" : isDark ? "#f0f0f0" : BRAND_GRAY;

  const fontSize = isRoot ? "1.2rem" : depth === 1 ? "0.9375rem" : "0.875rem";
  const fontWeight = isRoot ? "700" : "400";

  // Handles invisible — React Flow needs them for edge routing
  const handleStyle = "!w-2 !h-2 !bg-transparent !border-none !opacity-0";

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        minWidth: 60,
        // Square Corners (0px) as requested
        borderRadius: "0px",
        ...(fillColor ? {
          backgroundColor: fillColor,
          padding: "8px 16px",
        } : {
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          padding: "4px 8px",
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
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <input
            ref={inputRef}
            value={label}
            onChange={handleTextChange}
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
              minWidth: "80px",
              width: `${Math.max(80, label.length * 9)}px`,
              textAlign: "center",
              display: "block",
            }}
          />
          <input
            value={subLabel}
            onChange={handleSubTextChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Cargo / Setor"
            autoFocus={false}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.05)",
              outline: "none",
              border: "none",
              color: textColor,
              fontSize: "0.75rem",
              // Improved placeholder visibility
              fontFamily: "inherit",
              minWidth: "80px",
              width: `${Math.max(80, subLabel.length * 7)}px`,
              textAlign: "center",
              borderRadius: "2px",
            }}
            className="placeholder:text-inherit placeholder:opacity-70"
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
              width: "100%",
            }}
          >
            {label}
          </span>
          {subLabel && (
            <span
              style={{
                color: textColor,
                fontSize: "0.75rem",
                opacity: 0.7,
                lineHeight: "1.2",
                marginTop: "2px",
                userSelect: "none",
                textAlign: "center",
                display: "block",
                width: "100%",
              }}
            >
              {subLabel}
            </span>
          )}
        </div>
      )}

      {(data as any).hasChildren && !isRoot && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("mindmap-toggle-collapse", { detail: { nodeId: id } }));
          }}
          className="collapse-button"
          style={{
            position: "absolute",
            bottom: -6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: `1.5px solid ${(data as any).branchHex || "#e5e7eb"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            zIndex: 10,
            transition: "all 0.2s ease",
          }}
        >
          {(data as any).isCollapsed && (
            <div 
              style={{ 
                width: 4, 
                height: 4, 
                borderRadius: "2px", 
                backgroundColor: (data as any).branchHex || "#6b7280" 
              }} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(OrgMindMapNode);
