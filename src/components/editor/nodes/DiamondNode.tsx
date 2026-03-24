import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type DiamondNodeData = {
  label: string;
  color?: string;
  showHandles?: boolean;
};


function DiamondNode({ data, selected, id }: NodeProps & { data: DiamondNodeData }) {
  const handleStyle = cn(
    "!w-1.2 !h-1.2 !bg-muted-foreground/30 !border-none",
    "!transition-opacity !duration-200",
    !data.showHandles && "!opacity-0 !pointer-events-none",
    data.showHandles && "!opacity-100 !pointer-events-auto hover:!bg-primary hover:!scale-150"
  );
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

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
      className="group relative"
      style={{
        padding: '10px',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        textAlign: 'center',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(45deg)'
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

      <div style={{ transform: 'rotate(-45deg)', padding: '8px' }}>
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent outline-none text-center w-full min-w-[50px] text-xs font-semibold"
          />
        ) : (
          <span className="text-xs font-semibold text-center block leading-tight">{label || "Decisão?"}</span>
        )}
      </div>
    </div>
  );
}

export default memo(DiamondNode);
