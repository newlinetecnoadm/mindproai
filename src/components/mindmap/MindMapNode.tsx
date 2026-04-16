import { memo, useState, useRef, useEffect, useCallback } from "react";
import {
  Handle, Position, NodeToolbar,
  useNodeId, type NodeProps,
} from "@xyflow/react";
import { ChevronRight, ChevronDown, Plus, Trash2, StickyNote, Smile, Square, Circle, RectangleHorizontal, PenLine } from "lucide-react";
import { useMindMapStore, type MindMapNodeData, type NodeShape } from "@/store/useMindMapStore";
import { useUserRole } from "@/components/editor/UserRoleContext";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Emoji picker rápido ──────────────────────────────────────────────────────
const QUICK_EMOJIS = [
  "💡", "⭐", "🎯", "✅", "❌", "⚡", "🔥", "💰",
  "🚀", "🎨", "📌", "🔑", "📊", "🧠", "💬", "🔗",
  "⚙️", "📝", "🗺️", "🏆", "📅", "👥", "🌱", "🔒",
  // limpa ícone
  "∅",
];

// ─── Estilos por profundidade ─────────────────────────────────────────────────

function getBorderRadius(depth: number, shape: NodeShape | undefined): number | string {
  if (shape === "rectangle") return 4;
  if (shape === "oval") return 999;
  if (shape === "diamond") return 4;
  // default: rounded
  if (depth === 0) return 28;
  if (depth === 1) return 12;
  if (depth === 2) return 6;
  return 4;
}

function getNodeStyle(
  depth: number,
  isRoot: boolean,
  side: "left" | "right" | undefined,
  branchColor: string | undefined,
  selected: boolean,
  shape?: NodeShape,
  isDark?: boolean,
  flowStyle?: boolean,
): React.CSSProperties {
  const color = branchColor ?? "#94a3b8";
  const radius = getBorderRadius(depth, shape);

  if (isRoot) {
    return {
      padding: "10px 22px",
      borderRadius: radius,
      background: isDark ? "rgba(255,255,255,0.1)" : "var(--background, #ffffff)",
      border: isDark ? "2.5px solid rgba(255,255,255,0.2)" : "2.5px solid rgba(100,100,100,0.15)",
      boxShadow: selected
        ? `0 0 0 3px ${color}55, 0 8px 32px rgba(0,0,0,0.12)`
        : isDark
          ? "0 4px 24px rgba(0,0,0,0.4)"
          : "0 4px 24px rgba(0,0,0,0.1)",
      transition: "box-shadow 0.2s ease",
      cursor: "default",
    };
  }

  // Flow diagram style: always render a box regardless of depth
  if (flowStyle) {
    // Diamond nodes use an inline-SVG background so fill + stroke render
    // properly on all four diagonal edges (clipPath+border drops the corner
    // borders and produces a washed-out look).
    if (shape === "diamond") {
      const fill = isDark ? `${color}33` : `${color}1f`;
      const stroke = color;
      // viewBox 160x72, 2px inset so the stroke isn't cropped at the corners
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 72' preserveAspectRatio='none'><polygon points='80,2 158,36 80,70 2,36' fill='${fill}' stroke='${stroke}' stroke-width='2' stroke-linejoin='round'/></svg>`;
      return {
        minWidth: 160,
        minHeight: 72,
        // Horizontal padding is large because a diamond only offers
        // ~50% usable width at the vertical center. Top/bottom padding
        // matches the stroke inset.
        padding: "18px 42px",
        background: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") center/100% 100% no-repeat`,
        boxShadow: selected ? `0 0 0 3px ${color}40` : "none",
        transition: "box-shadow 0.2s ease, filter 0.2s ease",
        filter: selected ? "none" : "drop-shadow(0 1px 2px rgba(0,0,0,0.06))",
        cursor: "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };
    }

    return {
      padding: depth <= 1 ? "8px 18px" : "6px 14px",
      borderRadius: radius,
      background: depth === 0 ? "var(--background, #fff)" : depth === 1 ? color : `${color}18`,
      border: depth === 0 ? "2.5px solid rgba(100,100,100,0.15)" : depth === 1 ? `2px solid ${color}` : `2px solid ${color}80`,
      boxShadow: selected ? `0 0 0 3px ${color}40` : depth === 1 ? `0 2px 8px ${color}40` : "none",
      transition: "box-shadow 0.2s ease",
      cursor: "default",
      maxWidth: 200,
      wordBreak: "break-word",
      overflowWrap: "break-word",
    };
  }

  if (depth === 1) {
    return {
      padding: "7px 16px",
      borderRadius: radius,
      background: color,
      border: `2px solid ${color}`,
      boxShadow: selected
        ? `0 0 0 3px ${color}55, 0 4px 16px ${color}44`
        : `0 2px 10px ${color}44`,
      transition: "box-shadow 0.2s ease, transform 0.15s ease",
      cursor: "default",
    };
  }

  if (depth === 2) {
    return {
      padding: "4px 10px",
      borderRadius: radius,
      background: shape === "rectangle" || shape === "oval" ? `${color}15` : "transparent",
      borderBottom: shape ? `2px solid ${color}` : `2px solid ${color}`,
      border: (shape === "rectangle" || shape === "oval") ? `2px solid ${color}` : undefined,
      boxShadow: selected ? `0 2px 0 0 ${color}` : "none",
      transition: "box-shadow 0.15s ease",
      cursor: "default",
      maxWidth: 220,
    };
  }

  // depth >= 3
  return {
    padding: "2px 6px",
    background: shape === "rectangle" || shape === "oval" ? `${color}10` : "transparent",
    border: (shape === "rectangle" || shape === "oval") ? `1px solid ${color}40` : undefined,
    borderRadius: shape ? radius : undefined,
    cursor: "default",
    maxWidth: 200,
  };
}

function getTextStyle(
  depth: number,
  isRoot: boolean,
  branchColor: string | undefined,
  side?: string,
  isDark?: boolean,
  flowStyle?: boolean,
  shape?: NodeShape,
): React.CSSProperties {
  const textAlign = side === "left" ? "right" : "left";

  if (isRoot) {
    return {
      fontSize: "1.15rem",
      fontWeight: 700,
      color: isDark ? "rgba(255,255,255,0.95)" : "var(--foreground, #0f172a)",
      letterSpacing: "-0.02em",
      userSelect: "none",
      whiteSpace: "pre-wrap",
      maxWidth: 240,
      outline: "none",
      textAlign: "center",
    };
  }

  // Diamond nodes: always use branch color text for readability (light bg)
  if (shape === "diamond") {
    return {
      fontSize: "0.85rem",
      fontWeight: 600,
      color: branchColor ?? "#374151",
      userSelect: "none",
      whiteSpace: "nowrap",
      outline: "none",
      textAlign: "center",
    };
  }

  if (flowStyle) {
    return {
      fontSize: depth <= 1 ? "0.88rem" : "0.85rem",
      fontWeight: depth <= 1 ? 600 : 500,
      color: depth === 1 ? "#ffffff" : isDark ? "rgba(255,255,255,0.88)" : "var(--foreground, #1e293b)",
      userSelect: "none",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      overflowWrap: "break-word",
      maxWidth: 160,
      outline: "none",
      textAlign: "center",
    };
  }

  if (depth === 1) {
    return {
      fontSize: "0.88rem",
      fontWeight: 600,
      color: "#ffffff",
      userSelect: "none",
      whiteSpace: "pre-wrap",
      maxWidth: 220,
      outline: "none",
      textAlign,
    };
  }

  if (depth === 2) {
    return {
      fontSize: "0.85rem",
      fontWeight: 500,
      color: isDark ? "rgba(255,255,255,0.88)" : "var(--foreground, #1e293b)",
      userSelect: "none",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      maxWidth: 180,
      outline: "none",
      textAlign,
    };
  }

  return {
    fontSize: "0.8rem",
    fontWeight: 400,
    color: isDark ? "rgba(255,255,255,0.6)" : "var(--muted-foreground, #64748b)",
    userSelect: "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxWidth: 160,
    outline: "none",
    textAlign,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

function MindMapNodeComponent({
  data,
  selected,
  isConnectable,
}: NodeProps & { data: MindMapNodeData }) {
  const nodeId = useNodeId()!;
  const userRole = useUserRole();
  const isReadOnly = userRole === "viewer";
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);
  const updateNodeNotes = useMindMapStore((s) => s.updateNodeNotes);
  const updateNodeIcon = useMindMapStore((s) => s.updateNodeIcon);
  const updateNodeShape = useMindMapStore((s) => s.updateNodeShape);
  const addChild = useMindMapStore((s) => s.addChild);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const diagramType = useMindMapStore((s) => s.diagramType);
  const pendingSketchSource = useMindMapStore((s) => s.pendingSketchSource);
  const setPendingSketchSource = useMindMapStore((s) => s.setPendingSketchSource);

  const [editing, setEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);
  const [notesOpen, setNotesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(data.notes ?? "");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setLocalLabel(data.label);
  }, [data.label, editing]);

  useEffect(() => {
    if (!notesOpen) setLocalNotes(data.notes ?? "");
  }, [data.notes, notesOpen]);

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
      if (isReadOnly) return;
      const { nodeId: targetId, replaceText, char } = (e as CustomEvent).detail ?? {};
      if (targetId === nodeId) {
        if (replaceText) setLocalLabel(char ?? "");
        setEditing(true);
      }
    };
    window.addEventListener("mindmap-edit-node", handler);
    return () => window.removeEventListener("mindmap-edit-node", handler);
  }, [nodeId, isReadOnly]);

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

  const cycleShape = useCallback(() => {
    const shapes: NodeShape[] = ["rounded", "rectangle", "oval", "diamond"];
    const current = data.shape ?? "rounded";
    const next = shapes[(shapes.indexOf(current) + 1) % shapes.length];
    updateNodeShape(nodeId, next);
  }, [nodeId, data.shape, updateNodeShape]);

  // ─── Props derivadas ────────────────────────────────────────────────────────
  const { branchColor, depth = 0, isRoot = false, side, collapsed, hasChildren, icon, notes, shape, isDark } = data;

  const isFlowDiagram = diagramType === "orgchart" || diagramType === "flowchart";

  const wrapperStyle = getNodeStyle(depth, isRoot, side, branchColor, !!selected, shape, isDark, isFlowDiagram && !isRoot);
  const textStyle = getTextStyle(depth, isRoot, branchColor, side, isDark, isFlowDiagram && !isRoot, shape);

  // Handles direction: flow diagrams use TOP/BOTTOM, mindmap uses LEFT/RIGHT
  const sourcePos = isFlowDiagram
    ? Position.Bottom
    : isRoot ? undefined : side === "left" ? Position.Left : Position.Right;
  const targetPos = isFlowDiagram
    ? Position.Top
    : isRoot ? undefined : side === "left" ? Position.Right : Position.Left;
  const collapseButtonSide = side === "left" ? "left" : "right";

  const ShapeIcon = shape === "rectangle" ? Square : shape === "oval" ? Circle : RectangleHorizontal;
  const shapeTitle = shape === "rectangle" ? "Retângulo" : shape === "oval" ? "Oval" : "Arredondado";

  return (
    <>
      {/* Toolbar de ações */}
      <NodeToolbar isVisible={selected && !isRoot && !isReadOnly} position={Position.Top} offset={6}>
        <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur border border-border rounded-lg px-1 py-1 shadow-lg">
          {/* Adicionar filho */}
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => addChild(nodeId)}
            title="Adicionar filho (Tab)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Editar */}
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
            title="Editar texto (F2)"
          >
            ✏️
          </button>

          {/* Notas */}
          <Popover open={notesOpen} onOpenChange={setNotesOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "nodrag nopan flex items-center justify-center w-6 h-6 rounded transition-colors text-muted-foreground hover:text-foreground",
                  notes ? "hover:bg-yellow-100 text-yellow-600" : "hover:bg-muted"
                )}
                title="Anotações"
              >
                <StickyNote className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-2"
              side="top"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Anotação do nó</p>
              <textarea
                className="nodrag nopan w-full h-20 text-xs rounded border border-border bg-background p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Escreva uma anotação..."
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <button
                className="mt-1.5 w-full text-xs bg-primary text-primary-foreground rounded px-2 py-1 hover:opacity-90 transition-opacity"
                onClick={commitNotes}
              >
                Salvar
              </button>
            </PopoverContent>
          </Popover>

          {/* Ícone/Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Ícone do nó"
              >
                {icon && icon !== "∅" ? (
                  <span className="text-sm leading-none">{icon}</span>
                ) : (
                  <Smile className="w-3.5 h-3.5" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-52 p-2"
              side="top"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Escolher ícone</p>
              <div className="grid grid-cols-8 gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="nodrag nopan w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-sm transition-colors"
                    onClick={() => updateNodeIcon(nodeId, emoji === "∅" ? "" : emoji)}
                    title={emoji === "∅" ? "Remover ícone" : emoji}
                  >
                    {emoji === "∅" ? <span className="text-[10px] text-muted-foreground">✕</span> : emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Forma do nó — apenas no fluxograma */}
          {diagramType === "flowchart" && (
            <button
              className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              onClick={cycleShape}
              title={`Forma: ${shapeTitle} (clique para alternar)`}
            >
              <ShapeIcon className="w-3 h-3" />
            </button>
          )}

          {/* Seta rascunho */}
          <button
            className={cn(
              "nodrag nopan flex items-center justify-center w-6 h-6 rounded transition-colors",
              pendingSketchSource === nodeId
                ? "bg-green-500/20 text-green-600 ring-1 ring-green-500"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setPendingSketchSource(pendingSketchSource === nodeId ? null : nodeId)}
            title="Adicionar seta rascunho"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>

          {/* Separador */}
          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Deletar */}
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
            onClick={() => deleteNode(nodeId)}
            title="Excluir (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </NodeToolbar>

      {/* Sketch connection handles — 4 sides, hidden until hover via CSS */}
      <Handle type="source" position={Position.Top}    id="sk-top"    isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, top: -4,    opacity: 0, zIndex: 10 }} />
      <Handle type="source" position={Position.Bottom} id="sk-bottom" isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, bottom: -4, opacity: 0, zIndex: 10 }} />
      <Handle type="source" position={Position.Left}   id="sk-left"   isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, left: -4,   opacity: 0, zIndex: 10 }} />
      <Handle type="source" position={Position.Right}  id="sk-right"  isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, right: -4,  opacity: 0, zIndex: 10 }} />
      <Handle type="target" position={Position.Top}    id="sk-t-top"    isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, top: -4,    opacity: 0, zIndex: 10 }} />
      <Handle type="target" position={Position.Bottom} id="sk-t-bottom" isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, bottom: -4, opacity: 0, zIndex: 10 }} />
      <Handle type="target" position={Position.Left}   id="sk-t-left"   isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, left: -4,   opacity: 0, zIndex: 10 }} />
      <Handle type="target" position={Position.Right}  id="sk-t-right"  isConnectable={isConnectable} style={{ background: "transparent", border: "2px solid #94a3b8", width: 8, height: 8, right: -4,  opacity: 0, zIndex: 10 }} />

      {/* Handles */}
      {isFlowDiagram ? (
        <>
          {/* Flow diagram handles: both vertical (bottom/top) and horizontal (right/left)
              are always present so the layout can switch direction without remounting nodes */}
          {isRoot ? (
            <>
              <Handle type="source" position={Position.Bottom} id="s-bottom" className="mindmap-handle" isConnectable={isConnectable} style={{ background: "#94a3b8", opacity: 0 }} />
              <Handle type="source" position={Position.Right} id="s-right" className="mindmap-handle" isConnectable={isConnectable} style={{ background: "#94a3b8", opacity: 0 }} />
            </>
          ) : (
            <>
              <Handle type="target" position={Position.Top} id="t-top" className="mindmap-handle" isConnectable={isConnectable} style={{ background: branchColor ?? "#94a3b8", opacity: 0 }} />
              <Handle type="source" position={Position.Bottom} id="s-bottom" className="mindmap-handle" isConnectable={isConnectable} style={{ background: branchColor ?? "#94a3b8", opacity: 0 }} />
              <Handle type="target" position={Position.Left} id="t-left" className="mindmap-handle" isConnectable={isConnectable} style={{ background: branchColor ?? "#94a3b8", opacity: 0 }} />
              <Handle type="source" position={Position.Right} id="s-right" className="mindmap-handle" isConnectable={isConnectable} style={{ background: branchColor ?? "#94a3b8", opacity: 0 }} />
            </>
          )}
        </>
      ) : isRoot ? (
        <>
          <Handle type="source" position={Position.Right} id="s-right" className="mindmap-handle" isConnectable={isConnectable} style={{ background: "#94a3b8" }} />
          <Handle type="source" position={Position.Left} id="s-left" className="mindmap-handle" isConnectable={isConnectable} style={{ background: "#94a3b8" }} />
        </>
      ) : (
        <>
          {hasChildren && (
            <Handle type="source" position={sourcePos!} id="s-out" className="mindmap-handle" isConnectable={isConnectable} style={{ background: branchColor ?? "#94a3b8", opacity: 0 }} />
          )}
          <Handle type="target" position={targetPos!} id="t-in" className="mindmap-handle" isConnectable={isConnectable} style={{ background: branchColor ?? "#94a3b8", opacity: 0 }} />
        </>
      )}

      {/* Nó visual */}
      <div
        style={wrapperStyle}
        onDoubleClick={() => !editing && !isReadOnly && setEditing(true)}
        className={cn("relative group", { "cursor-text": editing })}
      >
        {/* Indicador de nota */}
        {notes && !editing && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border border-white"
            title="Tem anotação"
            style={{ zIndex: 5 }}
          />
        )}

        {editing ? (
          <div
            className="flex items-center gap-1.5"
            style={{ justifyContent: isFlowDiagram || isRoot ? "center" : side === "left" ? "flex-end" : "flex-start" }}
          >
            {icon && icon !== "∅" && (
              <span style={{ fontSize: depth === 0 ? "1.1rem" : "0.95rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
            )}
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              className="nodrag nopan nowheel outline-none"
              style={{ ...textStyle, userSelect: "auto" }}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              dangerouslySetInnerHTML={{ __html: localLabel }}
            />
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5"
            style={{ justifyContent: isFlowDiagram || isRoot ? "center" : side === "left" ? "flex-end" : "flex-start" }}
          >
            {icon && icon !== "∅" && (
              <span style={{ fontSize: depth === 0 ? "1.1rem" : "0.95rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
            )}
            <span style={textStyle}>{localLabel}</span>
          </div>
        )}

        {/* Botão de colapsar */}
        {hasChildren && !editing && (
          <button
            className="nodrag nopan absolute opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              [isFlowDiagram ? "bottom" : collapseButtonSide]: isFlowDiagram ? "-10px" : "-12px",
              ...(isFlowDiagram ? { left: "50%", transform: "translateX(-50%)" } : { top: "50%", transform: "translateY(-50%)" }),
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: branchColor ?? "#94a3b8",
              border: "2px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              zIndex: 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(nodeId);
            }}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? (
              <ChevronRight className="w-2.5 h-2.5 text-white" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 text-white" />
            )}
          </button>
        )}
      </div>
    </>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
export default MindMapNode;
