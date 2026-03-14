import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { Trash2, Palette, Copy, Plus, Square, Diamond, Circle, Hexagon, LayoutGrid, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nodeColors = [
  { name: "Padrão", value: "default", dot: "bg-muted-foreground" },
  { name: "Laranja", value: "orange", dot: "bg-orange-500" },
  { name: "Azul", value: "blue", dot: "bg-blue-500" },
  { name: "Verde", value: "green", dot: "bg-emerald-500" },
  { name: "Roxo", value: "purple", dot: "bg-purple-500" },
  { name: "Vermelho", value: "red", dot: "bg-red-500" },
  { name: "Amarelo", value: "yellow", dot: "bg-amber-500" },
];

const flowShapes = [
  { name: "Retângulo", value: "rectangle", icon: Square },
  { name: "Losango", value: "diamond", icon: Diamond },
  { name: "Oval", value: "oval", icon: Circle },
  { name: "Paralelogramo", value: "parallelogram", icon: Hexagon },
];

interface NodeFloatingToolbarProps {
  selectedNodes: Node[];
  diagramType: string;
  onColorChange: (color: string) => void;
  onShapeChange: (shape: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onVariantChange?: (variant: string) => void;
}

const NodeFloatingToolbar = ({
  selectedNodes,
  diagramType,
  onColorChange,
  onShapeChange,
  onDuplicate,
  onDelete,
  onAddChild,
  onVariantChange,
}: NodeFloatingToolbarProps) => {
  const { getNodesBounds, flowToScreenPosition } = useReactFlow();

  const position = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    try {
      const bounds = getNodesBounds(selectedNodes);
      const screenPos = flowToScreenPosition({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height,
      });
      return { x: screenPos.x, y: screenPos.y + 12 };
    } catch {
      return null;
    }
  }, [selectedNodes, getNodesBounds, flowToScreenPosition]);

  if (selectedNodes.length === 0 || !position) return null;

  const showShapes = diagramType === "flowchart";
  const showVariant = diagramType === "orgchart";

  return (
    <div
      className="absolute z-20 flex items-center gap-0.5 bg-card border border-border rounded-lg px-1 py-1 shadow-lg -translate-x-1/2 pointer-events-auto"
      style={{ left: position.x, top: position.y }}
    >
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddChild} title="Adicionar filho (Tab)">
        <Plus className="w-3.5 h-3.5" />
      </Button>

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicar">
        <Copy className="w-3.5 h-3.5" />
      </Button>

      {/* Color picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cor">
            <Palette className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="min-w-[120px]">
          {nodeColors.map((c) => (
            <DropdownMenuItem key={c.value} onClick={() => onColorChange(c.value)}>
              <span className={`w-3 h-3 rounded-full ${c.dot} mr-2`} />
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Shape picker (flowchart only) */}
      {showShapes && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Forma">
              <Square className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="min-w-[130px]">
            {flowShapes.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => onShapeChange(s.value)}>
                <s.icon className="w-3.5 h-3.5 mr-2" />
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Variant picker (orgchart only) */}
      {showVariant && onVariantChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Estilo do nó">
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="min-w-[140px]">
            <DropdownMenuItem onClick={() => onVariantChange("full")}>
              <User className="w-3.5 h-3.5 mr-2" />
              Completo (avatar + cargo)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onVariantChange("simple")}>
              <Square className="w-3.5 h-3.5 mr-2" />
              Simples (cor + título)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
        title="Excluir (Delete)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default NodeFloatingToolbar;
