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
  showHandles?: boolean;
};


function OrgNode({ data, selected, id }: NodeProps & { data: OrgNodeData }) {
  const handleStyle = cn(
    "!w-1.2 !h-1.2 !bg-muted-foreground/30 !border-none",
    "!transition-opacity !duration-200",
    !data.showHandles && "!opacity-0 !pointer-events-none",
    data.showHandles && "!opacity-100 !pointer-events-auto hover:!bg-primary hover:!scale-150"
  );
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [role, setRole] = useState(data.role || "");
  const labelRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const isSimple = data.variant === "simple";
  const depth = (data as any).depth ?? 0;
  const isDepth1 = !(data as any).isRoot && depth === 1;
  const fillColor = isDepth1 ? ((data as any).branchHex as string | undefined) : undefined;


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
  
  const commitLabel = () => { setEditingLabel(false); data.label = label; window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } })); };
  const commitRole = () => { setEditingRole(false); data.role = role; window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "role", value: role } })); };

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
        style={{
          padding: '10px 16px',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          textAlign: 'center',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: fillColor,
          color: fillColor ? '#ffffff' : undefined,
        }}
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
            className={cn("bg-transparent outline-none text-center w-full min-w-[60px] text-sm font-semibold", fillColor && "text-white placeholder:text-white/70")}
          />
        ) : (
          <span className={cn("text-sm font-semibold leading-snug", fillColor && "text-white")}>{label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
      }}
    >
      {handles}

      <div className="p-3 flex items-center gap-3 rounded-xl w-full" style={{ backgroundColor: fillColor }}>
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", fillColor ? "bg-white/15" : "bg-muted")}>
          {data.avatarUrl ? (
            <img src={data.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
          ) : (
            <User className={cn("w-4 h-4", fillColor ? "text-white/80" : "text-muted-foreground")} />
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
              className={cn("bg-transparent outline-none w-full text-sm font-semibold", fillColor && "text-white placeholder:text-white/70")}
              placeholder="Nome"
            />
          ) : (
            <p
              className={cn("text-sm font-semibold break-words cursor-text rounded px-0.5 -mx-0.5", fillColor ? "text-white hover:bg-white/10" : "hover:bg-muted/50")}
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
              className={cn("bg-transparent outline-none w-full text-xs mt-0.5", fillColor ? "text-white/85 placeholder:text-white/70" : "text-muted-foreground")}
              placeholder="Cargo"
            />
          ) : (
            <p
              className={cn("text-xs truncate cursor-text rounded px-0.5 -mx-0.5 mt-0.5", fillColor ? "text-white/85 hover:bg-white/10" : "text-muted-foreground hover:bg-muted/50")}
              onDoubleClick={() => setEditingRole(true)}
              onClick={() => setEditingRole(true)}
            >
              {role || data.department || "Clique para editar cargo"}
            </p>
          )}
        </div>
      </div>

      {(data as any).hasChildren && (
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
            border: `1.5px solid ${((data as any).branchHex as string | undefined) || "#e5e7eb"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            zIndex: 10,
            transition: "all 0.2s ease",
            pointerEvents: "all",
          }}
        >
          {(data as any).isCollapsed && (
            <div 
              style={{ 
                width: 4, 
                height: 4, 
                borderRadius: "2px", 
                backgroundColor: ((data as any).branchHex as string | undefined) || "#6b7280" 
              }} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(OrgNode);
