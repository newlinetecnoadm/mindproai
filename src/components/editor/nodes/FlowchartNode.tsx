import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type FlowchartNodeData = {
  label: string;
  shape?: "rectangle" | "diamond" | "oval" | "parallelogram" | "cylinder";
  color?: string;
};

const shapeStyles: Record<string, string> = {
  rectangle: "rounded-lg",
  diamond: "rotate-45",
  oval: "rounded-full",
  parallelogram: "skew-x-[-12deg] rounded-md",
  cylinder: "rounded-t-[50%] rounded-b-[50%]",
};

const colorMap: Record<string, string> = {
  blue: "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  green: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  red: "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  yellow: "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  purple: "border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  orange: "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  default: "border-border bg-card text-foreground",
};

const handleStyle = "!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-none hover:!bg-primary/70";

function FlowchartNode({ data, selected, id }: NodeProps & { data: FlowchartNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail?.nodeId === id) setEditing(true); };
    window.addEventListener("mindmap-edit-node", handler);
    return () => window.removeEventListener("mindmap-edit-node", handler);
  }, [id]);

  const shape = data.shape || "rectangle";
  const colorClass = colorMap[data.color || "default"] || colorMap.default;
  const isDiamond = shape === "diamond";

  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      className={cn(
        "border-2 shadow-sm transition-all cursor-pointer min-w-[100px] min-h-[50px] flex items-center justify-center",
        shapeStyles[shape], colorClass,
        isDiamond ? "w-[100px] h-[100px]" : "px-5 py-3",
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

      <div className={cn(isDiamond && "-rotate-45", shape === "parallelogram" && "skew-x-[12deg]")}>
        {editing ? (
          <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
            className="bg-transparent outline-none text-center w-full min-w-[60px] text-sm font-medium" />
        ) : (
          <span className="text-sm font-medium text-center block">{label}</span>
        )}
      </div>
    </div>
  );
}

export default memo(FlowchartNode);
