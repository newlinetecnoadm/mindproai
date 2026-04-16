import { Plus, ZoomIn, ZoomOut, Trash2, Maximize, Undo2, Redo2, Download, Image, FileText, SwatchBook, Keyboard, List, Network, FileCode2, FileType, ArrowDown, ArrowRight } from "lucide-react";
import { useMindMapStore } from "@/store/useMindMapStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { editorThemes, type EditorTheme } from "./editorThemes";
import { cn } from "@/lib/utils";

const addLabels: Record<string, string> = {
  mindmap: "Adicionar nó filho",
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

// Mini preview of a theme
const ThemePreview = ({ theme, isActive }: { theme: EditorTheme; isActive: boolean }) => (
  <div
    className={cn(
      "w-full h-10 rounded-md border-2 relative overflow-hidden transition-all",
      isActive ? "border-primary ring-1 ring-primary/30" : "border-transparent"
    )}
    style={{ backgroundColor: theme.bg }}
  >
    {/* Simulated nodes */}
    <div className="absolute top-2 left-3 w-6 h-2 rounded-sm" style={{ backgroundColor: theme.edgeColor, opacity: 0.8 }} />
    <div className="absolute top-2 right-3 w-5 h-2 rounded-sm" style={{ backgroundColor: theme.edgeColor, opacity: 0.5 }} />
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 rounded-sm" style={{ backgroundColor: theme.edgeColor, opacity: 0.6 }} />
    {/* Simulated edges */}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40">
      <line x1="18" y1="12" x2="72" y2="12" stroke={theme.edgeColor} strokeWidth="1" opacity="0.6"
        strokeDasharray={theme.edgeAnimation !== "none" ? "3 2" : undefined}
      />
      <line x1="50" y1="12" x2="50" y2="32" stroke={theme.edgeColor} strokeWidth="1" opacity="0.4" />
    </svg>
    {/* Dot grid hint */}
    {[...Array(3)].map((_, i) => (
      <div key={i} className="absolute w-0.5 h-0.5 rounded-full" style={{
        backgroundColor: theme.dotColor,
        left: `${20 + i * 30}%`,
        top: "50%",
      }} />
    ))}
  </div>
);

interface EditorToolbarProps {
  onAddNode: () => void;
  onAddSpecialNode?: (type: "diamond" | "sticky") => void;
  onDelete: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onExportSvg: () => void;
  onExportMarkdown: () => void;
  onThemeChange: (theme: EditorTheme) => void;
  onReLayout: () => void;
  onEdgeTypeChange?: (type: string) => void;
  onAddIndependentNode?: () => void;
  currentThemeId: string;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  hasSelection: boolean;
  diagramType: string;
  exporting: boolean;
  canExportPdf?: boolean;
  userRole?: "owner" | "editor" | "viewer";
  viewMode?: "graph" | "outline";
  onViewModeChange?: (mode: "graph" | "outline") => void;
  onImportSketch?: () => void;
}



const TipButton = ({ label, children, ...rest }: { label: string; children: React.ReactNode } & React.ComponentProps<typeof Button>) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...rest}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs font-medium">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/** Toggle between vertical (DOWN) and horizontal (RIGHT) layout for flow diagrams */
const DirectionToggle = () => {
  const layoutDirection = useMindMapStore((s) => s.layoutDirection);
  const setLayoutDirection = useMindMapStore((s) => s.setLayoutDirection);
  const isVertical = layoutDirection === "DOWN";

  return (
    <>
      <div className="w-px h-5 bg-border mx-1" />
      <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
        <TipButton
          label="Layout Vertical"
          variant={isVertical ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={() => setLayoutDirection("DOWN")}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </TipButton>
        <TipButton
          label="Layout Horizontal"
          variant={!isVertical ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={() => setLayoutDirection("RIGHT")}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </TipButton>
      </div>
    </>
  );
};

  const EditorToolbar = ({
  onAddNode, onAddSpecialNode, onDelete, onSave, onZoomIn, onZoomOut, onFitView,
  onUndo, onRedo, onExportPng, onExportPdf, onExportSvg, onExportMarkdown,
  onThemeChange, onReLayout, onAddIndependentNode, currentThemeId,
  canUndo, canRedo, saving, hasSelection, diagramType, exporting, canExportPdf = true,
  userRole = "viewer",
  viewMode = "graph",
  onViewModeChange,
  onImportSketch,
}: EditorToolbarProps) => {
  return (
    <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-2 py-1.5 shadow-md flex-wrap max-w-[calc(100vw-2rem)]">
      {/* View Toggle */}
      <div className="flex items-center bg-muted/50 rounded-lg p-0.5 mr-1">
        <TipButton
          label="Visualização em Gráfico"
          variant={viewMode === "graph" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={() => onViewModeChange?.("graph")}
        >
          <Network className="w-3.5 h-3.5" />
        </TipButton>
        <TipButton
          label="Visualização em Esboço"
          variant={viewMode === "outline" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={() => onViewModeChange?.("outline")}
        >
          <List className="w-3.5 h-3.5" />
        </TipButton>
      </div>

      {userRole !== "viewer" && (
        <TipButton
          label="Importar Esboço"
          variant="ghost"
          size="icon"
          className="h-8 w-8 mr-1 text-primary"
          onClick={onImportSketch}
        >
          <FileText className="w-4 h-4" />
        </TipButton>
      )}

      <Separator orientation="vertical" className="h-4 mx-1" />

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
            <TipButton 
              label={addLabels[diagramType] || "Adicionar nó (Tab)"} 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              disabled={userRole === "viewer"}
            >
              <Plus className="w-4 h-4" />
            </TipButton>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onAddNode}>
            <Plus className="w-3.5 h-3.5 mr-2" />
            {addLabels[diagramType] || "Adicionar nó"}
          </DropdownMenuItem>
          {onAddIndependentNode && (
            <DropdownMenuItem onClick={onAddIndependentNode}>
              <Network className="w-3.5 h-3.5 mr-2" />
              Novo Nó Avulso
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TipButton 
        label="Excluir selecionado (Delete)" 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8" 
        onClick={onDelete} 
        disabled={!hasSelection || userRole === "viewer"}
      >
        <Trash2 className="w-4 h-4" />
      </TipButton>

      <div className="w-px h-5 bg-border mx-1" />

      <TipButton label="Mais zoom (+)" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
        <ZoomIn className="w-4 h-4" />
      </TipButton>
      <TipButton label="Menos zoom (−)" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
        <ZoomOut className="w-4 h-4" />
      </TipButton>
      <TipButton label="Ajustar à tela" variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView}>
        <Maximize className="w-4 h-4" />
      </TipButton>

      {/* Layout direction toggle — only for flow diagrams */}
      {(diagramType === "flowchart" || diagramType === "orgchart") && (
        <DirectionToggle />
      )}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Theme picker with previews */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <TipButton label="Tema do editor" variant="ghost" size="icon" className="h-8 w-8">
              <SwatchBook className="w-4 h-4" />
            </TipButton>
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3" sideOffset={8}>
          <p className="text-xs font-semibold mb-3">Temas do Editor</p>
          <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {editorThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => onThemeChange(t)}
                className="text-left rounded-lg p-1.5 hover:bg-secondary/50 transition-all group"
              >
                <ThemePreview theme={t} isActive={currentThemeId === t.id} />
                <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                  <span className="text-xs">{t.emoji}</span>
                  <span className="text-xs font-medium truncate">{t.name}</span>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <TipButton label="Exportar diagrama" variant="ghost" size="icon" className="h-8 w-8" disabled={exporting}>
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
          <DropdownMenuItem onClick={onExportSvg}>
            <FileCode2 className="w-3.5 h-3.5 mr-2" />
            Exportar SVG
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExportMarkdown}>
            <FileType className="w-3.5 h-3.5 mr-2" />
            Exportar Markdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
