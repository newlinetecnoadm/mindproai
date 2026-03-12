import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type MindMapNodeData = {
  label: string;
  color?: string;
  isRoot?: boolean;
};

const colorMap: Record<string, string> = {
  orange: "border-primary bg-primary/10 text-primary",
  blue: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  green: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  purple: "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  red: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  yellow: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  default: "border-border bg-card text-foreground",
};

function MindMapNode({ data, selected, id }: NodeProps & { data: MindMapNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = () => setEditing(true);

  const handleBlur = () => {
    setEditing(false);
    data.label = label;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      data.label = label;
    }
    if (e.key === "Escape") {
      setLabel(data.label);
      setEditing(false);
    }
  };

  const colorClass = colorMap[data.color || "default"] || colorMap.default;
  const isRoot = data.isRoot;

  return (
    <div
      className={cn(
        "px-4 py-2 rounded-xl border-2 shadow-sm transition-all cursor-pointer min-w-[80px] text-center",
        colorClass,
        isRoot && "px-6 py-3 text-lg font-bold shadow-glow border-primary bg-primary text-primary-foreground",
        selected && !isRoot && "ring-2 ring-primary/50 shadow-md"
      )}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground/40 !border-none"
      />
      {editing ? (
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none text-center w-full min-w-[60px] font-medium"
          style={{ fontSize: isRoot ? "1.125rem" : "0.875rem" }}
        />
      ) : (
        <span className={cn("font-medium", isRoot ? "text-lg" : "text-sm")}>
          {label}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground/40 !border-none"
      />
    </div>
  );
}

export default memo(MindMapNode);
