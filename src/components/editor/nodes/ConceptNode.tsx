import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ConceptNodeData = {
  label: string;
  color?: string;
  note?: string;
};

const colorMap: Record<string, string> = {
  blue: "border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  green: "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  purple: "border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  red: "border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  orange: "border-orange-400 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  yellow: "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  default: "border-border bg-card text-foreground",
};

const handleStyle = "!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-none hover:!bg-primary/70";

function ConceptNode({ data, selected, id }: NodeProps & { data: ConceptNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

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

  const colorClass = colorMap[data.color || "default"] || colorMap.default;
  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-2xl border-2 shadow-sm transition-all cursor-pointer min-w-[100px] text-center",
        colorClass,
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

      {editing ? (
        <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
          className="bg-transparent outline-none text-center w-full min-w-[60px] text-sm font-medium" />
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
    </div>
  );
}

export default memo(ConceptNode);
