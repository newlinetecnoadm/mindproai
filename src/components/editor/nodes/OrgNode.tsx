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

function OrgNode({ data, selected }: NodeProps & { data: OrgNodeData }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [role, setRole] = useState(data.role || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const colorClass = deptColors[data.color || "default"] || deptColors.default;

  const handleBlur = () => {
    setEditing(false);
    data.label = label;
    data.role = role;
  };

  return (
    <div
      className={cn(
        "bg-card border border-border border-l-4 rounded-lg shadow-sm transition-all cursor-pointer w-[180px]",
        colorClass,
        selected && "ring-2 ring-primary/50 shadow-md"
      )}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
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
              <input
                ref={inputRef}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
                className="bg-transparent outline-none w-full text-sm font-semibold"
                placeholder="Nome"
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
                className="bg-transparent outline-none w-full text-xs text-muted-foreground"
                placeholder="Cargo"
              />
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
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
    </div>
  );
}

export default memo(OrgNode);
