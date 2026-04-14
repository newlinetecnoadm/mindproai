import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useUserRole } from "@/components/editor/UserRoleContext";
import { Trash2, ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Palettes & options ────────────────────────────────────────────────────────

const SKETCH_COLORS = [
  "#22c55e", "#3b82f6", "#f97316", "#e11d48",
  "#8b5cf6", "#eab308", "#94a3b8", "#0f172a",
];

const EDGE_COLORS = [
  { name: "Padrão",   value: undefined,   bg: "#94a3b8" },
  { name: "Azul",     value: "#4472C4",   bg: "#4472C4" },
  { name: "Verde",    value: "#70AD47",   bg: "#70AD47" },
  { name: "Roxo",     value: "#7B5EA7",   bg: "#7B5EA7" },
  { name: "Vermelho", value: "#C0392B",   bg: "#C0392B" },
  { name: "Amarelo",  value: "#D4AC0D",   bg: "#D4AC0D" },
  { name: "Laranja",  value: "#E9853A",   bg: "#E9853A" },
];

const LINE_TYPES = [
  { id: "dashed", label: "Tracejado",   dash: "7 4" },
  { id: "solid",  label: "Sólido",      dash: undefined },
  { id: "dotted", label: "Pontilhado",  dash: "2 4" },
];

const MARKER_OPTIONS = [
  { id: "none",       label: "Sem marcador",  icon: "—"  },
  { id: "open-arrow", label: "Seta aberta",   icon: "→"  },
  { id: "arrow",      label: "Seta fechada",  icon: "▶"  },
  { id: "circle",     label: "Círculo",       icon: "●"  },
];

// ── Tip button ────────────────────────────────────────────────────────────────

function TipBtn({
  label, onClick, children, active,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded text-sm transition-colors hover:bg-muted",
              active && "bg-muted"
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EdgeFloatingToolbarProps {
  selectedEdge: Edge | null;
  onDelete: (edgeId: string) => void;
  onColorChange: (edgeId: string, color: string | undefined) => void;
  onEdgeDataChange: (edgeId: string, data: Record<string, unknown>) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const EdgeFloatingToolbar = ({
  selectedEdge,
  onDelete,
  onColorChange,
  onEdgeDataChange,
}: EdgeFloatingToolbarProps) => {
  const { flowToScreenPosition, getNode } = useReactFlow();
  const userRole = useUserRole();
  if (userRole === "viewer") return null;

  const position = useMemo(() => {
    if (!selectedEdge) return null;
    try {
      const src = getNode(selectedEdge.source);
      const tgt = getNode(selectedEdge.target);
      if (!src || !tgt) return null;

      const sX = src.position.x + (src.measured?.width  ?? 100) / 2;
      const sY = src.position.y + (src.measured?.height ?? 40)  / 2;
      const tX = tgt.position.x + (tgt.measured?.width  ?? 100) / 2;
      const tY = tgt.position.y + (tgt.measured?.height ?? 40)  / 2;

      const isSketch = selectedEdge.type === "sketch";
      const d = selectedEdge.data as Record<string, unknown> | undefined;
      const midX = isSketch ? ((d?.cpX as number) ?? (sX + tX) / 2) : (sX + tX) / 2;
      const midY = isSketch ? ((d?.cpY as number) ?? (sY + tY) / 2) : (sY + tY) / 2;

      return flowToScreenPosition({ x: midX, y: midY });
    } catch {
      return null;
    }
  }, [selectedEdge, getNode, flowToScreenPosition]);

  if (!selectedEdge || !position) return null;

  const isSketch = selectedEdge.type === "sketch";
  const d = (selectedEdge.data ?? {}) as Record<string, unknown>;

  // Current values
  const currentColor: string = (d.color as string) ?? (selectedEdge.style?.stroke as string) ?? "#94a3b8";
  const lineType: string      = (d.lineType   as string) ?? "dashed";
  const markerEnd: string     = (d.markerEnd  as string) ?? "open-arrow";
  const markerStart: string   = (d.markerStart as string) ?? "none";

  const setData = (patch: Record<string, unknown>) =>
    onEdgeDataChange(selectedEdge.id, patch);

  const swapDirection = () =>
    onEdgeDataChange(selectedEdge.id, { _swapDirection: true });

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 bg-card border border-border rounded-xl px-1.5 py-1 shadow-lg -translate-x-1/2 pointer-events-auto"
      style={{ left: position.x, top: position.y - 44 }}
    >
      {/* ── Color dot ─────────────────────────────────────────────────── */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0 hover:scale-110 transition-transform"
            style={{ background: currentColor }}
            title="Cor"
          />
        </PopoverTrigger>
        <PopoverContent align="center" side="top" className="w-44 p-2">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Cor</p>
          <div className="flex flex-wrap gap-1.5">
            {(isSketch ? SKETCH_COLORS : EDGE_COLORS.map((c) => c.bg)).map((c) => (
              <button
                key={c}
                onClick={() =>
                  isSketch
                    ? setData({ color: c })
                    : onColorChange(selectedEdge.id, c === "#94a3b8" ? undefined : c)
                }
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: c === currentColor ? "#000" : "transparent",
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-4 bg-border mx-0.5" />

      {/* ── Sketch-only controls ───────────────────────────────────────── */}
      {isSketch && (
        <>
          {/* Line type */}
          <Popover>
            <PopoverTrigger asChild>
              <TipBtn label="Estilo da linha">
                <span className="text-xs font-bold leading-none text-muted-foreground">—</span>
              </TipBtn>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" className="w-36 p-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Estilo</p>
              {LINE_TYPES.map((lt) => (
                <button
                  key={lt.id}
                  onClick={() => setData({ lineType: lt.id })}
                  className={cn(
                    "flex items-center gap-2 w-full rounded px-2 py-1 text-xs hover:bg-muted transition-colors",
                    lineType === lt.id && "bg-muted font-semibold"
                  )}
                >
                  <svg width="24" height="4" className="shrink-0">
                    <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="1.5"
                      strokeDasharray={lt.dash ?? "none"} />
                  </svg>
                  {lt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Direction */}
          <TipBtn label="Mudar direção" onClick={swapDirection}>
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
          </TipBtn>

          {/* End marker */}
          <Popover>
            <PopoverTrigger asChild>
              <TipBtn label="Fim da linha">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </TipBtn>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" className="w-40 p-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Fim da linha</p>
              {MARKER_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setData({ markerEnd: m.id })}
                  className={cn(
                    "flex items-center gap-2 w-full rounded px-2 py-1 text-xs hover:bg-muted transition-colors",
                    markerEnd === m.id && "bg-muted font-semibold"
                  )}
                >
                  <span className="w-4 text-center leading-none">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Start marker */}
          <Popover>
            <PopoverTrigger asChild>
              <TipBtn label="Início da linha">
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </TipBtn>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" className="w-40 p-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Início da linha</p>
              {MARKER_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setData({ markerStart: m.id })}
                  className={cn(
                    "flex items-center gap-2 w-full rounded px-2 py-1 text-xs hover:bg-muted transition-colors",
                    markerStart === m.id && "bg-muted font-semibold"
                  )}
                >
                  <span className="w-4 text-center leading-none">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="w-px h-4 bg-border mx-0.5" />
        </>
      )}

      {/* ── Delete ────────────────────────────────────────────────────── */}
      <TipBtn label="Excluir conexão" onClick={() => onDelete(selectedEdge.id)}>
        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
      </TipBtn>
    </div>
  );
};

export default EdgeFloatingToolbar;
