import { Plus, ZoomIn, ZoomOut, Palette, Trash2, Maximize, Undo2, Redo2, Download, Image, FileText, SwatchBook, Keyboard, LayoutGrid, Diamond, StickyNote, Spline, ArrowRight as ArrowIcon, MoveRight, GitBranch, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { editorThemes, type EditorTheme } from "./editorThemes";

const nodeColors = [
  { name: "Padrão", value: "default" },
  { name: "Laranja", value: "orange" },
  { name: "Azul", value: "blue" },
  { name: "Verde", value: "green" },
  { name: "Roxo", value: "purple" },
  { name: "Vermelho", value: "red" },
  { name: "Amarelo", value: "yellow" },
];

const colorDots: Record<string, string> = {
  default: "bg-muted-foreground",
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  yellow: "bg-amber-500",
};

const addLabels: Record<string, string> = {
  mindmap: "Adicionar nó filho",
  flowchart: "Adicionar passo",
  orgchart: "Adicionar membro",
  timeline: "Adicionar marco",
  concept_map: "Adicionar conceito",
};

const shortcuts = [
  { keys: ["Tab"], desc: "Adicionar nó filho" },
  { keys: ["Enter"], desc: "Adicionar nó irmão" },
  { keys: ["F2"], desc: "Editar texto do nó" },
  { keys: ["←"], desc: "Ir para o nó pai" },
  { keys: ["→"], desc: "Ir para o primeiro filho" },
  { keys: ["↑"], desc: "Irmão anterior" },
  { keys: ["↓"], desc: "Próximo irmão" },
  { keys: ["Delete"], desc: "Excluir nó selecionado" },
  { keys: ["Ctrl", "Z"], desc: "Desfazer" },
  { keys: ["Ctrl", "⇧", "Z"], desc: "Refazer" },
  { keys: ["Ctrl", "D"], desc: "Duplicar nó" },
  { keys: ["Ctrl", "F"], desc: "Buscar nó" },
];

const Kbd = ({ children }: { children: string }) => (
  <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded bg-muted border border-border text-[10px] font-mono font-medium text-muted-foreground">
    {children}
  </kbd>
);

interface EditorToolbarProps {
  onAddNode: () => void;
  onAddSpecialNode?: (type: "diamond" | "sticky") => void;
  onDelete: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onThemeChange: (theme: EditorTheme) => void;
  onReLayout: () => void;
  onEdgeTypeChange?: (type: string) => void;
  onAIAssist?: () => void;
  currentThemeId: string;
  currentEdgeType?: string;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  hasSelection: boolean;
  diagramType: string;
  exporting: boolean;
  canExportPdf?: boolean;
}

const edgeTypeOptions = [
  { value: "smoothstep", label: "Padrão", icon: MoveRight },
  { value: "curved", label: "Curva", icon: Spline },
  { value: "straight", label: "Reta", icon: ArrowIcon },
  { value: "orthogonal", label: "Ortogonal", icon: GitBranch },
  { value: "hierarchy", label: "Hierarquia", icon: GitBranch },
];

const TipButton = ({ label, children, ...rest }: { label: string; children: React.ReactNode } & React.ComponentProps<typeof Button>) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...rest}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const EditorToolbar = ({
  onAddNode, onAddSpecialNode, onDelete, onSave, onZoomIn, onZoomOut, onFitView,
  onColorChange, onUndo, onRedo, onExportPng, onExportPdf,
  onThemeChange, onReLayout, onEdgeTypeChange, onAIAssist, currentThemeId, currentEdgeType = "smoothstep",
  canUndo, canRedo, saving, hasSelection, diagramType, exporting, canExportPdf = true,
}: EditorToolbarProps) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-2 py-1.5 shadow-md">
      <TipButton label="Desfazer (Ctrl+Z)" variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="w-4 h-4" />
      </TipButton>
      <TipButton label="Refazer (Ctrl+Shift+Z)" variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="w-4 h-4" />
      </TipButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Add node dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <TipButton label={addLabels[diagramType] || "Adicionar nó (Tab)"} variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </TipButton>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onAddNode}>
            <Plus className="w-3.5 h-3.5 mr-2" />
            {addLabels[diagramType] || "Adicionar nó"}
          </DropdownMenuItem>
          {onAddSpecialNode && (
            <>
              <DropdownMenuItem onClick={() => onAddSpecialNode("diamond")}>
                <Diamond className="w-3.5 h-3.5 mr-2" />
                Decisão (Losango)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddSpecialNode("sticky")}>
                <StickyNote className="w-3.5 h-3.5 mr-2" />
                Nota Adesiva
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TipButton label="Excluir (Delete)" variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} disabled={!hasSelection}>
        <Trash2 className="w-4 h-4" />
      </TipButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <TipButton label="Cor do nó" variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSelection}>
              <Palette className="w-4 h-4" />
            </TipButton>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {nodeColors.map((c) => (
            <DropdownMenuItem key={c.value} onClick={() => onColorChange(c.value)}>
              <span className={`w-3 h-3 rounded-full ${colorDots[c.value]} mr-2`} />
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edge type picker */}
      {onEdgeTypeChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span>
              <TipButton label="Tipo de aresta" variant="ghost" size="icon" className="h-8 w-8">
                <Spline className="w-4 h-4" />
              </TipButton>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            {edgeTypeOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onEdgeTypeChange(opt.value)}
                className={currentEdgeType === opt.value ? "bg-accent" : ""}
              >
                <opt.icon className="w-3.5 h-3.5 mr-2" />
                {opt.label}
                {currentEdgeType === opt.value && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="w-px h-5 bg-border mx-1" />

      <TipButton label="Zoom in" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
        <ZoomIn className="w-4 h-4" />
      </TipButton>
      <TipButton label="Zoom out" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
        <ZoomOut className="w-4 h-4" />
      </TipButton>
      <TipButton label="Ajustar visão" variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView}>
        <Maximize className="w-4 h-4" />
      </TipButton>
      <TipButton label="Reorganizar layout" variant="ghost" size="icon" className="h-8 w-8" onClick={onReLayout}>
        <LayoutGrid className="w-4 h-4" />
      </TipButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Theme picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <TipButton label="Tema do editor" variant="ghost" size="icon" className="h-8 w-8">
              <SwatchBook className="w-4 h-4" />
            </TipButton>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {editorThemes.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => onThemeChange(t)}
              className={currentThemeId === t.id ? "bg-accent" : ""}
            >
              <span className="mr-2">{t.emoji}</span>
              {t.name}
              {currentThemeId === t.id && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <TipButton label="Exportar" variant="ghost" size="icon" className="h-8 w-8" disabled={exporting}>
              <Download className="w-4 h-4" />
            </TipButton>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onExportPng}>
            <Image className="w-3.5 h-3.5 mr-2" />
            Exportar PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPdf}>
            <FileText className="w-3.5 h-3.5 mr-2" />
            Exportar PDF
            {!canExportPdf && (
              <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">PRO</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onAIAssist && (
        <TipButton label="Assistente IA" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onAIAssist}>
          <Bot className="w-4 h-4" />
          IA
        </TipButton>
      )}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Keyboard shortcuts help */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <TipButton label="Atalhos de teclado" variant="ghost" size="icon" className="h-8 w-8">
              <Keyboard className="w-4 h-4" />
            </TipButton>
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3" sideOffset={8}>
          <p className="text-xs font-semibold text-foreground mb-2">Atalhos de teclado</p>
          <div className="space-y-1.5">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{s.desc}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {s.keys.map((k, j) => (
                    <Kbd key={j}>{k}</Kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EditorToolbar;
