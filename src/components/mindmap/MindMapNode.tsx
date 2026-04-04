import { memo, useState, useRef, useEffect, useCallback } from "react";
import {
  Handle, Position, NodeToolbar,
  useNodeId, type NodeProps,
} from "@xyflow/react";
import { ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMindMapStore, type MindMapNodeData } from "@/store/useMindMapStore";
import { cn } from "@/lib/utils";

// ─── Estilos por profundidade ─────────────────────────────────────────────────

function getNodeStyle(
  depth: number,
  isRoot: boolean,
  side: "left" | "right" | undefined,
  branchColor: string | undefined,
  selected: boolean
): React.CSSProperties {
  const color = branchColor ?? "#94a3b8";

  if (isRoot) {
    return {
      padding: "10px 22px",
      borderRadius: 28,
      background: "var(--background, #ffffff)",
      border: "2.5px solid rgba(100,100,100,0.15)",
      boxShadow: selected
        ? `0 0 0 3px ${color}55, 0 8px 32px rgba(0,0,0,0.12)`
        : "0 4px 24px rgba(0,0,0,0.1)",
      transition: "box-shadow 0.2s ease",
      cursor: "default",
    };
  }

  if (depth === 1) {
    // Branch principal — caixa colorida como na imagem de referência
    return {
      padding: "7px 16px",
      borderRadius: 12,
      background: color,
      border: `2px solid ${color}`,
      boxShadow: selected
        ? `0 0 0 3px ${color}55, 0 4px 16px ${color}44`
        : `0 2px 10px ${color}44`,
      transition: "box-shadow 0.2s ease, transform 0.15s ease",
      cursor: "default",
    };
  }

  // Nós de texto (depth >= 2): largura baseada no conteúdo
  // Não usar maxWidth aqui — o fit-content garante que o nó mede exatamente o texto
  // e o alinhamento fica ancorado ao conector
  if (depth === 2) {
    return {
      padding: "4px 10px",
      borderRadius: 6,
      background: "transparent",
      borderBottom: `2px solid ${color}`,
      boxShadow: selected ? `0 2px 0 0 ${color}` : "none",
      transition: "box-shadow 0.15s ease",
      cursor: "default",
      width: "fit-content",
    };
  }

  // depth >= 3 — folhas, só texto
  return {
    padding: "2px 6px",
    background: "transparent",
    cursor: "default",
    width: "fit-content",
  };
}

function getTextStyle(
  depth: number,
  isRoot: boolean,
  branchColor: string | undefined,
  side?: string
): React.CSSProperties {
  // Alinhamento: nós à esquerda escrevem da direita para esquerda (text-align: right)
  const textAlign = side === "left" ? "right" : "left";

  if (isRoot) {
    return {
      fontSize: "1.15rem",
      fontWeight: 700,
      color: "var(--foreground, #0f172a)",
      letterSpacing: "-0.02em",
      userSelect: "none",
      whiteSpace: "pre-wrap",
      maxWidth: 240,
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
      color: "var(--foreground, #1e293b)",
      userSelect: "none",
      whiteSpace: "nowrap",
      outline: "none",
      textAlign,
    };
  }

  return {
    fontSize: "0.8rem",
    fontWeight: 400,
    color: "var(--muted-foreground, #64748b)",
    userSelect: "none",
    whiteSpace: "nowrap",
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
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);
  const addChild = useMindMapStore((s) => s.addChild);
  const deleteNode = useMindMapStore((s) => s.deleteNode);

  const [editing, setEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);
  const inputRef = useRef<HTMLDivElement>(null);

  // Sync label quando store muda externamente
  useEffect(() => {
    if (!editing) setLocalLabel(data.label);
  }, [data.label, editing]);

  // Auto-focus ao entrar em modo de edição: seleciona TODO o texto
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      // Não colapsar — isso seleciona tudo automaticamente
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  // Trigger de edição via evento global (teclado no DiagramEditorCore)
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

  // ─── Props derivadas ────────────────────────────────────────────────────────
  const { branchColor, depth = 0, isRoot = false, side, collapsed, hasChildren } = data;

  const wrapperStyle = getNodeStyle(depth, isRoot, side, branchColor, !!selected);
  const textStyle = getTextStyle(depth, isRoot, branchColor, side);

  // Handles direcionais baseados no lado
  // Raiz: source nos dois lados  
  // Side=right: source à direita, target à esquerda
  // Side=left: source à esquerda, target à direita
  const sourcePos = isRoot ? undefined : side === "left" ? Position.Left : Position.Right;
  const targetPos = isRoot ? undefined : side === "left" ? Position.Right : Position.Left;

  // Posição do botão de colapso (do lado de saída dos filhos)
  const collapseButtonSide = side === "left" ? "left" : "right";

  return (
    <>
      {/* Toolbar de ações */}
      <NodeToolbar isVisible={selected && !isRoot} position={Position.Top} offset={6}>
        <div className="flex items-center gap-1 bg-card/95 backdrop-blur border border-border rounded-lg px-1.5 py-1 shadow-lg">
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => addChild(nodeId)}
            title="Adicionar filho (Tab)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
            title="Editar texto"
          >
            ✏️
          </button>
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
            onClick={() => deleteNode(nodeId)}
            title="Excluir (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </NodeToolbar>

      {/* Handles: source apenas quando tem filhos, target sempre */}
      {isRoot ? (
        // Raiz tem handles nos dois lados para outputs
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="s-right"
            className="mindmap-handle"
            isConnectable={isConnectable}
            style={{ background: "#94a3b8" }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="s-left"
            className="mindmap-handle"
            isConnectable={isConnectable}
            style={{ background: "#94a3b8" }}
          />
        </>
      ) : (
        <>
          {/* Source: só renderiza quando o nó tem filhos (evita ponto extra em folhas) */}
          {hasChildren && (
            <Handle
              type="source"
              position={sourcePos!}
              id="s-out"
              className="mindmap-handle"
              isConnectable={isConnectable}
              style={{ background: branchColor ?? "#94a3b8", opacity: 0 }}
            />
          )}
          {/* Target: sempre presente — ponto de chegada do pai */}
          <Handle
            type="target"
            position={targetPos!}
            id="t-in"
            className="mindmap-handle"
            isConnectable={isConnectable}
            style={{ background: branchColor ?? "#94a3b8", opacity: 0 }}
          />
        </>
      )}

      {/* Nó visual */}
      <div
        style={wrapperStyle}
        onDoubleClick={() => !editing && setEditing(true)}
        className={cn("relative group", {
          "cursor-text": editing,
        })}
      >
        {editing ? (
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
        ) : (
          <span style={textStyle}>{localLabel}</span>
        )}

        {/* Botão de colapsar — aparece no lado dos filhos */}
        {hasChildren && !editing && (
          <button
            className="nodrag nopan absolute opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              [collapseButtonSide]: "-12px",
              top: "50%",
              transform: "translateY(-50%)",
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
