import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type DiamondNodeData = {
  label: string;
  color?: string;
};

const colorMap: Record<string, { border: string; bg: string; text: string }> = {
  default: { border: "border-border", bg: "bg-card", text: "text-foreground" },
  blue: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-800 dark:text-blue-200" },
  green: { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-800 dark:text-emerald-200" },
  red: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950", text: "text-red-800 dark:text-red-200" },
  yellow: { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-800 dark:text-amber-200" },
  purple: { border: "border-purple-500", bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-800 dark:text-purple-200" },
  orange: { border: "border-orange-500", bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-800 dark:text-orange-200" },
};

const handleStyle = "!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-none hover:!bg-primary/70";

function DiamondNode({ data, selected, id }: NodeProps & { data: DiamondNodeData }) {
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

  const colors = colorMap[data.color || "default"] || colorMap.default;

  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      className={cn(
        "w-[110px] h-[110px] rotate-45 border-2 shadow-sm transition-all cursor-pointer flex items-center justify-center",
        colors.border, colors.bg,
        selected && "ring-2 ring-primary/50 shadow-md"
      )}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="source" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
      <Handle type="target" position={Position.Right} id="right" className={handleStyle} />

      <div className={cn("-rotate-45 px-2", colors.text)}>
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent outline-none text-center w-full min-w-[50px] text-xs font-semibold"
          />
        ) : (
          <span className="text-xs font-semibold text-center block leading-tight">{label || "Decisão?"}</span>
        )}
      </div>
    </div>
  );
}

export default memo(DiamondNode);
