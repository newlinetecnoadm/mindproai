import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type StickyNoteNodeData = {
  label: string;
  color?: string;
  showHandles?: boolean;
};


function StickyNoteNode({ data, selected, id }: NodeProps & { data: StickyNoteNodeData }) {
  const handleStyle = cn(
    "!w-1.2 !h-1.2 !bg-muted-foreground/30 !border-none",
    "!transition-opacity !duration-200",
    !data.showHandles && "!opacity-0 !pointer-events-none",
    data.showHandles && "!opacity-100 !pointer-events-auto hover:!bg-primary hover:!scale-150"
  );
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
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
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      className={cn(
        "transition-all cursor-pointer relative",
        // Folded corner effect
        "before:absolute before:top-0 before:right-0 before:w-5 before:h-5 before:bg-black/5 dark:before:bg-white/5",
        "before:rounded-bl-md before:-z-10",
        "after:absolute after:-top-0.5 after:-right-0.5 after:w-5 after:h-5 after:bg-background after:z-10",
        "after:-rotate-45 after:origin-bottom-left"
      )}
      style={{
        padding: '12px',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        width: '100%',
        height: '100%',
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
        <textarea
          ref={textareaRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none w-full h-full min-h-[80px] text-xs font-medium resize-none"
          style={{ fontFamily: "'Caveat', 'Segoe UI', cursive" }}
        />
      ) : (
        <p
          className="text-xs font-medium whitespace-pre-wrap leading-relaxed"
          style={{ fontFamily: "'Caveat', 'Segoe UI', cursive" }}
        >
          {label || "Nota..."}
        </p>
      )}
    </div>
  );
}

export default memo(StickyNoteNode);
