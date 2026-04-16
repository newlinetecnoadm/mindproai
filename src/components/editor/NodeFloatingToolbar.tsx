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

  // Calcula posições baseadas no bounding box do nó selecionado
  const positions = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    try {
      const bounds = getNodesBounds(selectedNodes);
      const topLeft = flowToScreenPosition({ x: bounds.x, y: bounds.y });
      const bottomRight = flowToScreenPosition({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
      const centerX = (topLeft.x + bottomRight.x) / 2;
      const midY = (topLeft.y + bottomRight.y) / 2;
      return {
        // Dica "filho" — à direita do nó, no meio vertical
        childHint: { x: bottomRight.x + 8, y: midY },
        // Toolbar principal — abaixo do nó, centralizado
        toolbar: { x: centerX, y: bottomRight.y + 8 },
        nodeHeight: bottomRight.y - topLeft.y,
      };
    } catch {
      return null;
    }
  }, [selectedNodes, getNodesBounds, flowToScreenPosition]);

  if (selectedNodes.length === 0 || !positions) return null;

  const isRoot = (selectedNodes[0]?.data as any)?.isRoot;
  const showShapes = diagramType === "flowchart";
  const showVariant = diagramType === "orgchart";

  return (
    <>
      {/* Dica contextual de criação — à direita do nó */}
      {!isRoot && (
        <div
          className="absolute z-20 pointer-events-auto"
          style={{ left: positions.childHint.x, top: positions.childHint.y, transform: "translateY(-50%)" }}
        >
          <div className="flex flex-col gap-1.5 bg-card border border-border rounded-lg px-2.5 py-2 shadow-md">
            {/* Criar filho */}
            <button
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group nodrag nopan"
              onClick={onAddChild}
            >
              <span className="flex items-center justify-center w-5 h-5 rounded border border-border bg-muted/50 group-hover:bg-primary/10 group-hover:border-primary/40 transition-colors">
                <Plus className="w-3 h-3" />
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-muted border border-border text-[10px] font-mono font-medium">Tab</kbd>
                <span className="text-[11px] whitespace-nowrap">criar tópico filho</span>
              </span>
            </button>

            {/* Criar irmão */}
            {onAddSibling && (
              <button
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group nodrag nopan"
                onClick={onAddSibling}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded border border-border bg-muted/50 group-hover:bg-primary/10 group-hover:border-primary/40 transition-colors">
                  <Plus className="w-3 h-3" />
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-muted border border-border text-[10px] font-mono font-medium">Enter</kbd>
                  <span className="text-[11px] whitespace-nowrap">criar tópico irmão</span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toolbar de ações — abaixo do nó */}
      <div
        className="absolute z-20 flex items-center gap-0.5 bg-card border border-border rounded-lg px-1 py-1 shadow-lg -translate-x-1/2 pointer-events-auto"
        style={{ left: positions.toolbar.x, top: positions.toolbar.y }}
      >
        <TipButton
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDuplicate}
          label="Duplicar (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </TipButton>

        {/* Connector button */}
        {diagramType !== "orgchart" && (
          <TipButton
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary"
            label="Novo Conector"
            onClick={onToggleConnectors}
          >
            <Link2 className="w-3.5 h-3.5" />
          </TipButton>
        )}

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
    </>
  );
};

export default NodeFloatingToolbar;
