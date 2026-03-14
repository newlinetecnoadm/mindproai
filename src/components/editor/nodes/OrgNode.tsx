import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export type OrgNodeData = {
  label: string;
  role?: string;
  department?: string;
  color?: string;
  avatarUrl?: string;
  variant?: "full" | "simple";
};

const deptColors: Record<string, string> = {
  blue: "border-l-blue-500",
  green: "border-l-emerald-500",
  purple: "border-l-purple-500",
  red: "border-l-red-500",
  orange: "border-l-orange-500",
  yellow: "border-l-amber-500",
  default: "border-l-primary",
};

const simpleBgColors: Record<string, string> = {
  blue: "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300",
  green: "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300",
  purple: "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300",
  red: "bg-red-500/15 border-red-500 text-red-700 dark:text-red-300",
  orange: "bg-primary/15 border-primary text-primary",
  yellow: "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300",
  default: "bg-muted border-border text-foreground",
};

const handleStyle = "!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-none hover:!bg-primary/70";

function OrgNode({ data, selected, id }: NodeProps & { data: OrgNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [role, setRole] = useState(data.role || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const isSimple = data.variant === "simple";

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

  const colorClass = deptColors[data.color || "default"] || deptColors.default;
  const simpleColorClass = simpleBgColors[data.color || "default"] || simpleBgColors.default;
  const handleBlur = () => { setEditing(false); data.label = label; data.role = role; };

  const handles = (
    <>
      <Handle type="source" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
      <Handle type="target" position={Position.Right} id="right" className={handleStyle} />
    </>
  );

  if (isSimple) {
    return (
      <div
        className={cn(
          "rounded-xl border-2 shadow-sm transition-all cursor-pointer min-w-[120px] px-4 py-2.5 text-center",
          simpleColorClass,
          selected && "ring-2 ring-primary/50 shadow-md"
        )}
        onDoubleClick={() => setEditing(true)}
      >
        {handles}
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
            className="bg-transparent outline-none text-center w-full min-w-[60px] text-sm font-semibold"
          />
        ) : (
          <span className="text-sm font-semibold">{label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card border border-border border-l-4 rounded-lg shadow-sm transition-all cursor-pointer w-[200px]",
        colorClass,
        selected && "ring-2 ring-primary/50 shadow-md"
      )}
      onDoubleClick={() => setEditing(true)}
    >
      {handles}

      <div className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
          ) : (
            <User className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1">
              <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
                className="bg-transparent outline-none w-full text-sm font-semibold" placeholder="Nome" />
              <input value={role} onChange={(e) => setRole(e.target.value)} onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
                className="bg-transparent outline-none w-full text-xs text-muted-foreground" placeholder="Cargo" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate">{label}</p>
              {(data.role || data.department) && (
                <p className="text-xs text-muted-foreground truncate">
                  {data.role}{data.department ? ` · ${data.department}` : ""}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(OrgNode);
