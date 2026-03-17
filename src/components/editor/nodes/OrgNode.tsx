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
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [role, setRole] = useState(data.role || "");
  const labelRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const isSimple = data.variant === "simple";

  useEffect(() => { if (editingLabel && labelRef.current) { labelRef.current.focus(); labelRef.current.select(); } }, [editingLabel]);
  useEffect(() => { if (editingRole && roleRef.current) { roleRef.current.focus(); roleRef.current.select(); } }, [editingRole]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId === id) {
        if (detail?.replaceText) setLabel("");
        setEditingLabel(true);
      }
    };
    window.addEventListener("mindmap-edit-node", handler);
    return () => window.removeEventListener("mindmap-edit-node", handler);
  }, [id]);

  // Keep data in sync
  useEffect(() => { setLabel(data.label); }, [data.label]);
  useEffect(() => { setRole(data.role || ""); }, [data.role]);

  const colorClass = deptColors[data.color || "default"] || deptColors.default;
  const simpleColorClass = simpleBgColors[data.color || "default"] || simpleBgColors.default;
  
  const commitLabel = () => { setEditingLabel(false); data.label = label; };
  const commitRole = () => { setEditingRole(false); data.role = role; };

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
          "rounded-xl border-2 shadow-sm transition-all cursor-pointer w-[160px] px-4 py-2.5 text-center",
          simpleColorClass,
          selected && "ring-2 ring-primary/50 shadow-md"
        )}
        onDoubleClick={() => setEditingLabel(true)}
      >
        {handles}
        {editingLabel ? (
          <input
            ref={labelRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === "Enter") commitLabel(); }}
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
          {editingLabel ? (
            <input
              ref={labelRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") { commitLabel(); }
                if (e.key === "Tab") { e.preventDefault(); commitLabel(); setEditingRole(true); }
              }}
              className="bg-transparent outline-none w-full text-sm font-semibold"
              placeholder="Nome"
            />
          ) : (
            <p
              className="text-sm font-semibold truncate cursor-text hover:bg-muted/50 rounded px-0.5 -mx-0.5"
              onDoubleClick={() => setEditingLabel(true)}
              onClick={() => setEditingLabel(true)}
            >
              {label}
            </p>
          )}
          {editingRole ? (
            <input
              ref={roleRef}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onBlur={commitRole}
              onKeyDown={(e) => { if (e.key === "Enter") commitRole(); }}
              className="bg-transparent outline-none w-full text-xs text-muted-foreground mt-0.5"
              placeholder="Cargo"
            />
          ) : (
            <p
              className="text-xs text-muted-foreground truncate cursor-text hover:bg-muted/50 rounded px-0.5 -mx-0.5 mt-0.5"
              onDoubleClick={() => setEditingRole(true)}
              onClick={() => setEditingRole(true)}
            >
              {role || data.department || "Clique para editar cargo"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(OrgNode);
