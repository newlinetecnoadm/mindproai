import { Plus, ZoomIn, ZoomOut, Save, Palette, Trash2, Maximize, Undo2, Redo2, Download, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface EditorToolbarProps {
  onAddNode: () => void;
  onDelete: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  hasSelection: boolean;
  diagramType: string;
}

const EditorToolbar = ({
  onAddNode, onDelete, onSave, onZoomIn, onZoomOut, onFitView,
  onColorChange, onUndo, onRedo, canUndo, canRedo, saving, hasSelection, diagramType,
}: EditorToolbarProps) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-2 py-1.5 shadow-md">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)">
        <Redo2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddNode} title={addLabels[diagramType] || "Adicionar nó (Tab)"}>
        <Plus className="w-4 h-4" />
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} disabled={!hasSelection} title="Excluir (Delete)">
        <Trash2 className="w-4 h-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSelection} title="Cor do nó">
            <Palette className="w-4 h-4" />
          </Button>
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

      <div className="w-px h-5 bg-border mx-1" />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView} title="Ajustar visão">
        <Maximize className="w-4 h-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onSave} disabled={saving}>
        <Save className="w-4 h-4" />
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
};

export default EditorToolbar;
