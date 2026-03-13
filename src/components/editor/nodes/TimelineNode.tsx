import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type TimelineNodeData = {
  label: string;
  date?: string;
  description?: string;
  color?: string;
  isMilestone?: boolean;
};

const colorMap: Record<string, string> = {
  blue: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  green: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
  purple: "border-purple-500 bg-purple-50 dark:bg-purple-950",
  red: "border-red-500 bg-red-50 dark:bg-red-950",
  orange: "border-orange-500 bg-orange-50 dark:bg-orange-950",
  yellow: "border-amber-500 bg-amber-50 dark:bg-amber-950",
  default: "border-border bg-card",
};

function TimelineNode({ data, selected }: NodeProps & { data: TimelineNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const colorClass = colorMap[data.color || "default"] || colorMap.default;

  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      className={cn(
        "border-2 rounded-xl shadow-sm transition-all cursor-pointer w-[180px]",
        colorClass,
        data.isMilestone && "border-primary shadow-glow",
        selected && "ring-2 ring-primary/50 shadow-md"
      )}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <div className="p-3">
        {data.date && (
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{data.date}</span>
        )}
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent outline-none w-full text-sm font-semibold mt-1"
          />
        ) : (
          <p className="text-sm font-semibold mt-0.5">{label}</p>
        )}
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
    </div>
  );
}

export default memo(TimelineNode);
