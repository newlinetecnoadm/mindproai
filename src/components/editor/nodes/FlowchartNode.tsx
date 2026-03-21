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


const handleStyle = "!w-2.5 !h-2.5 !bg-muted-foreground/50 !border-none hover:!bg-primary/70";

function FlowchartNode({ data, selected, id }: NodeProps & { data: FlowchartNodeData }) {
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

  const shape = data.shape || "rectangle";
  const isDiamond = shape === "diamond";

  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setEditing(false); data.label = label; }
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      style={{
        padding: isDiamond ? '20px' : '12px 20px',
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

      <div className={cn(isDiamond && "-rotate-45", shape === "parallelogram" && "skew-x-[12deg]")}>
        {editing ? (
          <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
            className="bg-transparent outline-none text-center w-full min-w-[60px] text-sm font-medium" />
        ) : (
          <span className="text-sm font-medium text-center block leading-snug">{label}</span>
        )}
      </div>
    </div>
  );
}

export default memo(FlowchartNode);
