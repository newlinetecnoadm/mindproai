import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { Trash2, Copy, Plus, Square, Diamond, Circle, Hexagon, LayoutGrid, User, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const flowShapes = [
  { name: "Retângulo", value: "rectangle", icon: Square },
  { name: "Losango", value: "diamond", icon: Diamond },
  { name: "Oval", value: "oval", icon: Circle },
  { name: "Paralelogramo", value: "parallelogram", icon: Hexagon },
];

interface NodeFloatingToolbarProps {
  selectedNodes: Node[];
  diagramType: string;
  onShapeChange: (shape: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onAddSibling?: () => void;
  onVariantChange?: (variant: string) => void;
  onToggleConnectors?: () => void;
}

const TipButton = ({ label, children, ...rest }: { label: string; children: React.ReactNode } & React.ComponentProps<typeof Button>) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...rest}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const NodeFloatingToolbar = ({
  selectedNodes,
  diagramType,
  onShapeChange,
  onDuplicate,
  onDelete,
  onAddChild,
  onAddSibling,
  onVariantChange,
  onToggleConnectors,
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
      // Offset reduced to 4px as requested for closer proximity
      return { x: screenPos.x, y: screenPos.y + 4 };
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
      {/* + button with tooltip showing Tab/Enter shortcuts */}
      <div className="node-add-btn-wrapper">
        <TipButton 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          onClick={onAddChild} 
          label="Adicionar filho (Tab)"
        >
          <Plus className="w-3.5 h-3.5" />
        </TipButton>
        <div className="node-add-tooltip" role="tooltip">
          <div className="node-add-tooltip-row">
            <kbd>Tab</kbd>
            <span>para criar tópico filho</span>
          </div>
          {onAddSibling && (
            <div className="node-add-tooltip-row">
              <kbd>Enter</kbd>
              <span>para criar tópico irmão</span>
            </div>
          )}
        </div>
      </div>

      <TipButton 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7" 
        onClick={onDuplicate} 
        label="Duplicar (Ctrl+D)"
      >
        <Copy className="w-3.5 h-3.5" />
      </TipButton>

      {/* Connector button next to duplicate */}
      <TipButton 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-primary" 
        label="Novo Conector: Exibir pontos de ligação para este nó"
        onClick={onToggleConnectors}
      >
        <Link2 className="w-3.5 h-3.5" />
      </TipButton>

      {/* Shape picker (flowchart only) */}
      {showShapes && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span>
              <TipButton variant="ghost" size="icon" className="h-7 w-7" label="Trocar Forma">
                <Square className="w-3.5 h-3.5" />
              </TipButton>
            </span>
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
            <span>
              <TipButton variant="ghost" size="icon" className="h-7 w-7" label="Estilo do nó">
                <LayoutGrid className="w-3.5 h-3.5" />
              </TipButton>
            </span>
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

      <TipButton
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
        label="Excluir (Delete)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </TipButton>
    </div>
  );
};

export default NodeFloatingToolbar;
