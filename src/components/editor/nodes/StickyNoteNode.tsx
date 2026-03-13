import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type StickyNoteNodeData = {
  label: string;
  color?: string;
};

const stickyColors: Record<string, { bg: string; text: string; shadow: string }> = {
  default: { bg: "bg-yellow-100 dark:bg-yellow-900/60", text: "text-yellow-900 dark:text-yellow-100", shadow: "shadow-yellow-200/50 dark:shadow-yellow-800/30" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/60", text: "text-blue-900 dark:text-blue-100", shadow: "shadow-blue-200/50 dark:shadow-blue-800/30" },
  green: { bg: "bg-emerald-100 dark:bg-emerald-900/60", text: "text-emerald-900 dark:text-emerald-100", shadow: "shadow-emerald-200/50 dark:shadow-emerald-800/30" },
  red: { bg: "bg-red-100 dark:bg-red-900/60", text: "text-red-900 dark:text-red-100", shadow: "shadow-red-200/50 dark:shadow-red-800/30" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/60", text: "text-purple-900 dark:text-purple-100", shadow: "shadow-purple-200/50 dark:shadow-purple-800/30" },
  orange: { bg: "bg-orange-100 dark:bg-orange-900/60", text: "text-orange-900 dark:text-orange-100", shadow: "shadow-orange-200/50 dark:shadow-orange-800/30" },
  yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/60", text: "text-yellow-900 dark:text-yellow-100", shadow: "shadow-yellow-200/50 dark:shadow-yellow-800/30" },
};

const handleStyle = "!w-2 !h-2 !bg-transparent !border-none hover:!bg-primary/50";

function StickyNoteNode({ data, selected, id }: NodeProps & { data: StickyNoteNodeData }) {
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

  const colors = stickyColors[data.color || "default"] || stickyColors.default;

  const handleBlur = () => { setEditing(false); data.label = label; };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
  };

  return (
    <div
      className={cn(
        "w-[160px] min-h-[120px] p-3 rounded-sm shadow-md transition-all cursor-pointer relative",
        colors.bg, colors.shadow,
        selected && "ring-2 ring-primary/50 shadow-lg",
        // Folded corner effect
        "before:absolute before:top-0 before:right-0 before:w-5 before:h-5 before:bg-black/5 dark:before:bg-white/5",
        "before:[clip-path:polygon(100%_0,0_0,100%_100%)]"
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

      {editing ? (
        <textarea
          ref={textareaRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "bg-transparent outline-none w-full h-full min-h-[80px] text-xs font-medium resize-none",
            colors.text
          )}
          style={{ fontFamily: "'Caveat', 'Segoe UI', cursive" }}
        />
      ) : (
        <p
          className={cn("text-xs font-medium whitespace-pre-wrap leading-relaxed", colors.text)}
          style={{ fontFamily: "'Caveat', 'Segoe UI', cursive" }}
        >
          {label || "Nota..."}
        </p>
      )}
    </div>
  );
}

export default memo(StickyNoteNode);
