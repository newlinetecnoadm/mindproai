import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ConceptNodeData = {
  label: string;
  color?: string;
  note?: string;
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

  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        textAlign: 'center',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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

      {editing ? (
        <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
          className="bg-transparent outline-none text-center w-full min-w-[60px] text-sm font-medium" />
      ) : (
        <span className="text-sm font-medium leading-snug">{label}</span>
      )}
    </div>
  );
}

export default memo(ConceptNode);
