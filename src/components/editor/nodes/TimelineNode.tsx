import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type TimelineNodeData = {
  label: string;
  date?: string;
  description?: string;
  color?: string;
  isMilestone?: boolean;
  showHandles?: boolean;
};


function TimelineNode({ data, selected, id }: NodeProps & { data: TimelineNodeData }) {
  const handleStyle = cn(
    "!w-1.2 !h-1.2 !bg-muted-foreground/30 !border-none",
    "!transition-opacity !duration-200",
    !data.showHandles && "!opacity-0 !pointer-events-none",
    data.showHandles && "!opacity-100 !pointer-events-auto hover:!bg-primary hover:!scale-150"
  );
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

  const handleBlur = () => { setEditing(false); data.label = label; window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } })); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; window.dispatchEvent(new CustomEvent("node-data-changed", { detail: { nodeId: id, field: "label", value: label } })); }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      style={{
        padding: '8px 16px',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
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

      <div className="p-3">
        {data.date && (
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{data.date}</span>
        )}
        {editing ? (
          <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
            className="bg-transparent outline-none w-full text-sm font-semibold mt-1" />
        ) : (
          <p className="text-sm font-semibold mt-0.5">{label}</p>
        )}
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
        )}
      </div>
    </div>
  );
}

export default memo(TimelineNode);
