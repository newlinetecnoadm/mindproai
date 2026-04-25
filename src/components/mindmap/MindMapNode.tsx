import { memo, useState, useRef, useEffect, useCallback } from "react";
import {
  Handle, Position, NodeToolbar,
  useNodeId, useStore, type NodeProps,
} from "@xyflow/react";
import { Plus, Trash2, StickyNote, Smile, ChevronRight, ChevronDown, Link2, ExternalLink, Spline } from "lucide-react";
import { useMindMapStore, type MindMapNodeData, type NodeShape } from "@/store/useMindMapStore";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Paleta de cores estilo MindMeister ──────────────────────────────────────
const TOPIC_COLORS = [
  // Vermelhos / Laranjas
  "#e74c3c", "#c0392b", "#e67e22", "#d35400",
  // Amarelos / Verdes
  "#f1c40f", "#27ae60", "#2ecc71", "#1abc9c",
  // Azuis / Roxos
  "#3498db", "#2980b9", "#9b59b6", "#8e44ad",
  // Rosa / Pink
  "#fd79a8", "#e84393", "#74b9ff", "#0984e3",
  // Tons extras
  "#00b894", "#55efc4", "#636e72", "#2d3436",
  // Neutros
  "#7f8c8d", "#bdc3c7", "#ecf0f1", "#34495e",
];

// ─── Emojis rápidos ──────────────────────────────────────────────────────────
const QUICK_EMOJIS = [
  "💡", "⭐", "🎯", "✅", "❌", "⚡", "🔥", "💰",
  "🚀", "🎨", "📌", "🔑", "📊", "🧠", "💬", "🔗",
  "⚙️", "📝", "🗺️", "🏆", "📅", "👥", "🌱", "🔒",
  "∅",
];

// ─── Utilitários de cor ───────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function isColorDark(hex: string): boolean {
  try {
    const [r, g, b] = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  } catch { return true; }
}

function lightenHex(hex: string, amount: number): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
    return "#" + [clamp(r + amount), clamp(g + amount), clamp(b + amount)]
      .map(c => c.toString(16).padStart(2, "0")).join("");
  } catch { return hex; }
}

// ─── Estilos de nó ───────────────────────────────────────────────────────────
function getNodeStyle(
  depth: number,
  isRoot: boolean,
  displayColor: string,
  selected: boolean,
  isDark: boolean | undefined,
  customColor?: string,
  shape?: NodeShape,
): React.CSSProperties {
  if (isRoot) {
    // MindMeister: root is just text, selection shows consistent blue border
    return {
      padding: "6px 10px",
      borderRadius: 8,
      background: "transparent",
      border: selected ? "2px solid #2563eb" : "2px solid transparent",
      boxShadow: selected ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
      transition: "box-shadow 0.15s ease, border-color 0.15s ease",
      cursor: "default",
    };
  }

  // Diamond shape (flowchart)
  if (shape === "diamond") {
    return {
      padding: "22px 48px",
      borderRadius: 4,
      background: `${displayColor}20`,
      border: selected ? `2px solid ${displayColor}` : `1.5px solid ${displayColor}80`,
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      boxShadow: selected ? `0 0 0 3px ${displayColor}30` : "none",
      transition: "box-shadow 0.2s ease",
      cursor: "default",
      minWidth: 140,
    };
  }

  // ── MindMeister-style: texto puro por padrão, fundo só se customColor ──
  const hasFill = !!customColor;
  const fillPadding = depth === 1 ? "7px 18px" : depth === 2 ? "6px 14px" : "4px 11px";

  // Selection always uses MindMeister's consistent blue, fill nodes keep their color indicator
  return {
    padding: hasFill ? fillPadding : "3px 6px",
    borderRadius: hasFill ? 20 : 6,
    background: hasFill ? (customColor as string) : "transparent",
    border: selected ? "2px solid #2563eb" : "2px solid transparent",
    boxShadow: selected
      ? "0 0 0 2px rgba(37,99,235,0.12)"
      : hasFill
        ? `0 2px 8px ${customColor as string}44`
        : "none",
    transition: "box-shadow 0.15s ease, border-color 0.15s ease",
    cursor: "default",
  };
}

function getTextStyle(
  depth: number,
  isRoot: boolean,
  displayColor: string,
  isDark: boolean | undefined,
  customColor?: string,
  fontBold?: boolean,
  fontItalic?: boolean,
  fontUnderline?: boolean,
  fontSize?: "sm" | "md" | "lg",
  shape?: NodeShape,
): React.CSSProperties {
  // Se tem fundo preenchido, calcular contraste
  const hasFill = !!customColor;
  const fillTextColor = hasFill
    ? (isColorDark(customColor) ? "#ffffff" : "#1a1a1a")
    : undefined;

  // Tamanhos: root bem maior, filhos moderados (estilo MindMeister)
  const baseSize = depth === 0 ? 22 : depth === 1 ? 15 : depth === 2 ? 14 : 13;
  const sizeOffset = fontSize === "lg" ? 3 : fontSize === "sm" ? -2 : 0;
  const finalSize = baseSize + sizeOffset;

  // Peso
  const baseWeight = fontBold
    ? 700
    : depth === 0 ? 700 : depth === 1 ? 500 : 400;

  if (isRoot) {
    return {
      fontSize: `${finalSize}px`,
      fontWeight: baseWeight,
      fontStyle: fontItalic ? "italic" : undefined,
      textDecoration: fontUnderline ? "underline" : undefined,
      color: isDark ? "rgba(255,255,255,0.95)" : "#1a1a2e",
      letterSpacing: "-0.02em",
      userSelect: "none",
      whiteSpace: "pre-wrap",
      maxWidth: 280,
      outline: "none",
      textAlign: "center",
    };
  }

  if (shape === "diamond") {
    return {
      fontSize: `${finalSize}px`,
      fontWeight: baseWeight,
      fontStyle: fontItalic ? "italic" : undefined,
      textDecoration: fontUnderline ? "underline" : undefined,
      color: displayColor,
      userSelect: "none",
      whiteSpace: "nowrap",
      outline: "none",
      textAlign: "center",
    };
  }

  // Hierarchy: deeper nodes slightly lighter — matches MindMeister's visual weight
  const depthTextColor = depth <= 1 ? "#1a1a2e" : depth === 2 ? "#2d3748" : "#4a5568";
  const defaultTextColor = isDark ? "rgba(255,255,255,0.88)" : depthTextColor;

  return {
    fontSize: `${finalSize}px`,
    fontWeight: baseWeight,
    fontStyle: fontItalic ? "italic" : undefined,
    textDecoration: fontUnderline ? "underline" : undefined,
    color: fillTextColor ?? defaultTextColor,
    userSelect: "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxWidth: depth === 1 ? 240 : depth === 2 ? 200 : 180,
    outline: "none",
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────
function MindMapNodeComponent({
  data,
  selected,
  isConnectable,
}: NodeProps & { data: MindMapNodeData }) {
  const nodeId = useNodeId()!;
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);
  const updateNodeNotes = useMindMapStore((s) => s.updateNodeNotes);
  const updateNodeIcon = useMindMapStore((s) => s.updateNodeIcon);
  const updateNodeShape = useMindMapStore((s) => s.updateNodeShape);
  const updateNodeStyle = useMindMapStore((s) => s.updateNodeStyle);
  const addChild = useMindMapStore((s) => s.addChild);
  const addSibling = useMindMapStore((s) => s.addSibling);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const diagramType = useMindMapStore((s) => s.diagramType);
  const pendingSketchSource = useMindMapStore((s) => s.pendingSketchSource);
  const setPendingSketchSource = useMindMapStore((s) => s.setPendingSketchSource);

  // Count how many nodes are currently selected — used to suppress per-node toolbar
  const selectedCount = useStore((s) => s.nodes.filter((n) => n.selected).length);

  const [editing, setEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);
  const [notesOpen, setNotesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(data.notes ?? "");
  const [linkOpen, setLinkOpen] = useState(false);
  const [localLink, setLocalLink] = useState(data.link ?? "");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setLocalLabel(data.label);
  }, [data.label, editing]);

  useEffect(() => {
    if (!notesOpen) setLocalNotes(data.notes ?? "");
  }, [data.notes, notesOpen]);

  useEffect(() => {
    if (!linkOpen) setLocalLink(data.link ?? "");
  }, [data.link, linkOpen]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId: targetId, replaceText, char } = (e as CustomEvent).detail ?? {};
      if (targetId === nodeId) {
        if (replaceText) setLocalLabel(char ?? "");
        setEditing(true);
      }
    };
    window.addEventListener("mindmap-edit-node", handler);
    return () => window.removeEventListener("mindmap-edit-node", handler);
  }, [nodeId]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const text = inputRef.current?.textContent?.trim() ?? localLabel;
    if (text && text !== data.label) {
      updateNodeLabel(nodeId, text);
    } else {
      setLocalLabel(data.label);
    }
  }, [nodeId, updateNodeLabel, data.label, localLabel]);

  const commitNotes = useCallback(() => {
    updateNodeNotes(nodeId, localNotes);
    setNotesOpen(false);
  }, [nodeId, updateNodeNotes, localNotes]);

  const commitLink = useCallback(() => {
    updateNodeStyle(nodeId, { link: localLink.trim() || undefined });
    setLinkOpen(false);
  }, [nodeId, updateNodeStyle, localLink]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
      if (e.key === "Escape") {
        setLocalLabel(data.label);
        setEditing(false);
      }
    },
    [commitEdit, data.label]
  );

  // ─── Props derivadas ──────────────────────────────────────────────────────
  const {
    branchColor, depth = 0, isRoot = false, side,
    collapsed, hasChildren, icon, notes, shape, isDark,
    customColor, fontBold, fontItalic, fontUnderline, fontSize, link,
  } = data;

  // Cor efetiva do nó: customColor > branchColor > fallback
  const displayColor = customColor || branchColor || "#94a3b8";

  const isFlowDiagram = diagramType === "orgchart" || diagramType === "flowchart";
  // Colapso e "+" ficam no lado de saída da ramificação (onde os filhos estão)
  const collapseButtonSide = side === "left" ? "left" : "right";
  const addButtonSide = side === "left" ? "left" : "right";

  const wrapperStyle = getNodeStyle(depth, isRoot, displayColor, !!selected, isDark, customColor, shape);
  const textStyle = getTextStyle(depth, isRoot, displayColor, isDark, customColor, fontBold, fontItalic, fontUnderline, fontSize, shape);

  // Handles
  const sourcePos = isFlowDiagram
    ? Position.Bottom
    : isRoot ? undefined : side === "left" ? Position.Left : Position.Right;
  const targetPos = isFlowDiagram
    ? Position.Top
    : isRoot ? undefined : side === "left" ? Position.Right : Position.Left;

  // Cor do texto da toolbar (contraste)
  const isDisplayDark = isColorDark(displayColor);

  return (
    <>
      {/* ── Toolbar de formato estilo MindMeister ── */}
      <NodeToolbar isVisible={selected && !isRoot && selectedCount === 1} position={Position.Top} offset={8}>
        <div className="flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-1.5 py-1 shadow-xl backdrop-blur-sm">

          {/* ── Paleta de cores ── */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Cor do tópico"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ background: displayColor }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-3"
              side="top"
              sideOffset={6}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-zinc-500 mb-2">Cor do tópico</p>
              <div className="grid grid-cols-8 gap-1.5 mb-2">
                {TOPIC_COLORS.map((color) => (
                  <button
                    key={color}
                    className="nodrag nopan w-5 h-5 rounded-full transition-all hover:scale-125 focus:outline-none"
                    style={{
                      background: color,
                      boxShadow: (customColor === color || (!customColor && branchColor === color))
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : "none",
                    }}
                    onClick={() => updateNodeStyle(nodeId, {
                      customColor: color === branchColor ? undefined : color,
                    })}
                    title={color}
                  />
                ))}
              </div>
              {customColor && (
                <button
                  className="nodrag nopan w-full text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                  onClick={() => updateNodeStyle(nodeId, { customColor: undefined })}
                >
                  ↩ Restaurar cor da ramificação
                </button>
              )}
            </PopoverContent>
          </Popover>

          {/* Separador */}
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

          {/* ── Negrito ── */}
          <button
            className={cn(
              "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-xs font-bold",
              fontBold
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            )}
            onClick={() => updateNodeStyle(nodeId, { fontBold: !fontBold })}
            title="Negrito"
          >
            B
          </button>

          {/* ── Itálico ── */}
          <button
            className={cn(
              "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-xs italic",
              fontItalic
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            )}
            onClick={() => updateNodeStyle(nodeId, { fontItalic: !fontItalic })}
            title="Itálico"
          >
            I
          </button>

          {/* ── Sublinhado ── */}
          <button
            className={cn(
              "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-xs underline",
              fontUnderline
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            )}
            onClick={() => updateNodeStyle(nodeId, { fontUnderline: !fontUnderline })}
            title="Sublinhado"
          >
            U
          </button>

          {/* ── Tamanho de fonte ── */}
          <button
            className="nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors text-[10px] font-semibold"
            onClick={() => {
              const cycle: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
              const cur = fontSize ?? "md";
              const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
              updateNodeStyle(nodeId, { fontSize: next });
            }}
            title={`Tamanho: ${fontSize ?? "md"}`}
          >
            {fontSize === "sm" ? "S" : fontSize === "lg" ? "L" : "M"}
          </button>

          {/* Separador */}
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

          {/* ── Notas ── */}
          <Popover open={notesOpen} onOpenChange={setNotesOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                  notes
                    ? "text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                )}
                title="Anotações"
              >
                <StickyNote className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-60 p-2"
              side="top"
              sideOffset={6}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-zinc-500 mb-1.5">Anotação do tópico</p>
              <textarea
                className="nodrag nopan w-full h-24 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                placeholder="Escreva uma anotação..."
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <button
                className="mt-1.5 w-full text-xs bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg px-2 py-1.5 hover:opacity-90 transition-opacity font-medium"
                onClick={commitNotes}
              >
                Salvar
              </button>
            </PopoverContent>
          </Popover>

          {/* ── Ícone/Emoji ── */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                title="Ícone do tópico"
              >
                {icon && icon !== "∅" ? (
                  <span className="text-base leading-none">{icon}</span>
                ) : (
                  <Smile className="w-3.5 h-3.5" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-52 p-2"
              side="top"
              sideOffset={6}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-zinc-500 mb-1.5">Escolher ícone</p>
              <div className="grid grid-cols-8 gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="nodrag nopan w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm transition-colors"
                    onClick={() => updateNodeIcon(nodeId, emoji === "∅" ? "" : emoji)}
                    title={emoji === "∅" ? "Remover ícone" : emoji}
                  >
                    {emoji === "∅" ? <span className="text-[10px] text-zinc-400">✕</span> : emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* ── Link ── */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                  link
                    ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                )}
                title="Link do tópico"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-3"
              side="top"
              sideOffset={6}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-zinc-500 mb-1.5">Link do tópico</p>
              <input
                className="nodrag nopan w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                placeholder="https://..."
                value={localLink}
                onChange={(e) => setLocalLink(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") commitLink();
                }}
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  className="flex-1 text-xs bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg py-1.5 hover:opacity-90 transition-opacity font-medium"
                  onClick={commitLink}
                >
                  Salvar
                </button>
                {link && (
                  <button
                    className="text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1.5 transition-colors"
                    onClick={() => { updateNodeStyle(nodeId, { link: undefined }); setLinkOpen(false); }}
                  >
                    Remover
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* ── Seta rascunho (sketch connector) ── */}
          <button
            className={cn(
              "nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
              pendingSketchSource === nodeId
                ? "bg-green-500 text-white hover:bg-green-600"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            )}
            onClick={() => {
              if (pendingSketchSource === nodeId) {
                setPendingSketchSource(null);
              } else {
                setPendingSketchSource(nodeId);
              }
            }}
            title="Desenhar seta de conexão"
          >
            <Spline className="w-3.5 h-3.5" />
          </button>

          {/* Separador */}
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

          {/* ── Deletar ── */}
          <button
            className="nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors"
            onClick={() => deleteNode(nodeId)}
            title="Excluir (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </NodeToolbar>

      {/* ── Handles sketch (invisíveis, ativados por CSS no hover) ── */}
      <Handle type="source" position={Position.Top}    id="sk-top"      isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, top:-4,    opacity:0, zIndex:10 }} />
      <Handle type="source" position={Position.Bottom} id="sk-bottom"   isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, bottom:-4, opacity:0, zIndex:10 }} />
      <Handle type="source" position={Position.Left}   id="sk-left"     isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, left:-4,   opacity:0, zIndex:10 }} />
      <Handle type="source" position={Position.Right}  id="sk-right"    isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, right:-4,  opacity:0, zIndex:10 }} />
      <Handle type="target" position={Position.Top}    id="sk-t-top"    isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, top:-4,    opacity:0, zIndex:10 }} />
      <Handle type="target" position={Position.Bottom} id="sk-t-bottom" isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, bottom:-4, opacity:0, zIndex:10 }} />
      <Handle type="target" position={Position.Left}   id="sk-t-left"   isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, left:-4,   opacity:0, zIndex:10 }} />
      <Handle type="target" position={Position.Right}  id="sk-t-right"  isConnectable={isConnectable} style={{ background:"transparent", border:"2px solid #94a3b8", width:8, height:8, right:-4,  opacity:0, zIndex:10 }} />

      {/* ── Handles estruturais ── */}
      {isFlowDiagram ? (
        <>
          {isRoot ? (
            <Handle type="source" position={Position.Bottom} id="s-bottom" isConnectable={isConnectable} style={{ background: "#94a3b8", opacity: 0 }} />
          ) : (
            <>
              <Handle type="target" position={Position.Top} id="t-top" isConnectable={isConnectable} style={{ background: displayColor, opacity: 0 }} />
              <Handle type="source" position={Position.Bottom} id="s-bottom" isConnectable={isConnectable} style={{ background: displayColor, opacity: 0 }} />
            </>
          )}
        </>
      ) : isRoot ? (
        <>
          <Handle type="source" position={Position.Right} id="s-right" isConnectable={isConnectable} style={{ background: "#94a3b8", opacity: 0 }} />
          <Handle type="source" position={Position.Left} id="s-left" isConnectable={isConnectable} style={{ background: "#94a3b8", opacity: 0 }} />
        </>
      ) : (
        <>
          {hasChildren && (
            <Handle type="source" position={sourcePos!} id="s-out" isConnectable={isConnectable} style={{ background: displayColor, opacity: 0 }} />
          )}
          <Handle type="target" position={targetPos!} id="t-in" isConnectable={isConnectable} style={{ background: displayColor, opacity: 0 }} />
        </>
      )}

      {/* ── Nó visual ── */}
      <div
        style={wrapperStyle}
        onDoubleClick={() => !editing && setEditing(true)}
        className={cn("relative group", { "cursor-text": editing })}
      >
        {/* Indicador de nota */}
        {notes && !editing && (
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white shadow-sm"
            title="Tem anotação"
            style={{ zIndex: 5 }}
          />
        )}

        {/* Indicador de link */}
        {link && !editing && (
          <button
            className="nodrag nopan absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center hover:bg-blue-600 transition-colors"
            style={{ zIndex: 5 }}
            onClick={(e) => { e.stopPropagation(); window.open(link, "_blank"); }}
            title={`Abrir link: ${link}`}
          >
            <ExternalLink className="w-2 h-2 text-white" />
          </button>
        )}

        {/* Conteúdo */}
        {editing ? (
          <div className="flex items-center gap-1.5" style={{
            justifyContent: isFlowDiagram || isRoot ? "center" : side === "left" ? "flex-end" : "flex-start"
          }}>
            {icon && icon !== "∅" && (
              <span style={{ fontSize: depth === 0 ? "1.1rem" : "0.95rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
            )}
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              className="nodrag nopan nowheel outline-none"
              style={{ ...textStyle, userSelect: "auto", minWidth: 40 }}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              dangerouslySetInnerHTML={{ __html: localLabel }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5" style={{
            justifyContent: isFlowDiagram || isRoot ? "center" : side === "left" ? "flex-end" : "flex-start"
          }}>
            {icon && icon !== "∅" && (
              <span style={{ fontSize: depth === 0 ? "1.1rem" : "0.95rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
            )}
            <span style={textStyle}>{localLabel}</span>
          </div>
        )}

        {/* ── Botão colapsar/expandir (nós com filhos) ── */}
        {hasChildren && !editing && (
          <button
            className="nodrag nopan absolute opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              [collapseButtonSide]: "-14px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: displayColor,
              border: "2.5px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              zIndex: 10,
            }}
            onClick={(e) => { e.stopPropagation(); toggleCollapse(nodeId); }}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? (
              <ChevronRight className="w-3 h-3 text-white" />
            ) : (
              <ChevronDown className="w-3 h-3 text-white" />
            )}
          </button>
        )}

        {/* ── Botões "+" estilo MindMeister: filho (lado) + irmão (baixo) ── */}
        {!isRoot && !editing && !isFlowDiagram && selectedCount === 1 && (
          <>
            {/* Filho: aparece no lado de saída */}
            <button
              className={`nodrag nopan absolute transition-all duration-150 hover:scale-110 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              style={{
                [addButtonSide === "left" ? "left" : "right"]: "-18px",
                top: "50%",
                transform: "translateY(-50%)",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#2563eb",
                border: "2.5px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
                zIndex: 10,
              }}
              onClick={(e) => { e.stopPropagation(); addChild(nodeId); }}
              title="Adicionar filho (Tab)"
            >
              <Plus className="w-3 h-3 text-white" />
            </button>

            {/* Irmão: aparece embaixo */}
            <button
              className={`nodrag nopan absolute transition-all duration-150 hover:scale-110 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              style={{
                left: "50%",
                bottom: "-20px",
                transform: "translateX(-50%)",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#2563eb",
                border: "2.5px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
                zIndex: 10,
              }}
              onClick={(e) => { e.stopPropagation(); addSibling(nodeId); }}
              title="Adicionar irmão (Enter)"
            >
              <Plus className="w-3 h-3 text-white" />
            </button>
          </>
        )}
      </div>
    </>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
export default MindMapNode;
