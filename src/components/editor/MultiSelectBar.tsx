import { useStore, Panel } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useMindMapStore } from "@/store/useMindMapStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TOPIC_COLORS = [
  "#e74c3c", "#c0392b", "#e67e22", "#d35400",
  "#f1c40f", "#27ae60", "#2ecc71", "#1abc9c",
  "#3498db", "#2980b9", "#9b59b6", "#8e44ad",
  "#fd79a8", "#e84393", "#74b9ff", "#0984e3",
  "#00b894", "#55efc4", "#636e72", "#2d3436",
  "#7f8c8d", "#bdc3c7", "#ecf0f1", "#34495e",
];

export function MultiSelectBar() {
  const selectedNodes = useStore((s) => s.nodes.filter((n) => n.selected));
  const deleteNodes    = useMindMapStore((s) => s.deleteNodes);
  const updateNodeStyle = useMindMapStore((s) => s.updateNodeStyle);

  if (selectedNodes.length < 2) return null;

  const nonRoot = selectedNodes.filter((n) => !(n.data as any)?.isRoot);

  // Toggle logic: if ALL non-root nodes have the property active → turn it off; otherwise turn it on
  const allBold      = nonRoot.length > 0 && nonRoot.every((n) => (n.data as any)?.fontBold);
  const allItalic    = nonRoot.length > 0 && nonRoot.every((n) => (n.data as any)?.fontItalic);
  const allUnderline = nonRoot.length > 0 && nonRoot.every((n) => (n.data as any)?.fontUnderline);

  const applyToAll = (style: Parameters<typeof updateNodeStyle>[1]) => {
    nonRoot.forEach((n) => updateNodeStyle(n.id, style));
  };

  const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

  return (
    <Panel position="top-center" style={{ top: 16, zIndex: 30 }}>
      <div className="flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-1.5 shadow-xl backdrop-blur-sm select-none">

        {/* Counter */}
        <span className="text-[11px] text-zinc-400 font-medium px-1 whitespace-nowrap">
          {selectedNodes.length} selecionados
        </span>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* ── Color ── */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Cor dos tópicos"
            >
              <div className="w-4 h-4 rounded-full bg-zinc-300 border-2 border-white shadow-sm" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-3"
            side="bottom"
            sideOffset={6}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-zinc-500 mb-2">Cor dos tópicos</p>
            <div className="grid grid-cols-8 gap-1.5">
              {TOPIC_COLORS.map((color) => (
                <button
                  key={color}
                  className="nodrag nopan w-5 h-5 rounded-full transition-all hover:scale-125 focus:outline-none"
                  style={{ background: color }}
                  onClick={() => applyToAll({ customColor: color })}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* ── Bold ── */}
        <button
          className={cn(
            "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-xs font-bold",
            allBold
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          )}
          onClick={() => applyToAll({ fontBold: !allBold })}
          title="Negrito"
        >
          B
        </button>

        {/* ── Italic ── */}
        <button
          className={cn(
            "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-xs italic",
            allItalic
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          )}
          onClick={() => applyToAll({ fontItalic: !allItalic })}
          title="Itálico"
        >
          I
        </button>

        {/* ── Underline ── */}
        <button
          className={cn(
            "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-xs underline",
            allUnderline
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          )}
          onClick={() => applyToAll({ fontUnderline: !allUnderline })}
          title="Sublinhado"
        >
          U
        </button>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* ── Delete ── */}
        <button
          className="nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors"
          onClick={() => {
            if (nonRoot.length > 0) deleteNodes(nonRoot.map((n) => n.id));
          }}
          title="Excluir selecionados (Delete)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Panel>
  );
}
