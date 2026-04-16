import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { Plus } from "lucide-react";

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

const NodeFloatingToolbar = ({
  selectedNodes,
  onAddChild,
  onAddSibling,
}: NodeFloatingToolbarProps) => {
  const { getNodesBounds, flowToScreenPosition } = useReactFlow();

  const positions = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    try {
      const bounds = getNodesBounds(selectedNodes);
      const topLeft = flowToScreenPosition({ x: bounds.x, y: bounds.y });
      const bottomRight = flowToScreenPosition({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
      const centerX = (topLeft.x + bottomRight.x) / 2;
      const midY = (topLeft.y + bottomRight.y) / 2;
      return {
        // "+" filho — à direita do nó, vertically centered
        right: { x: bottomRight.x + 10, y: midY },
        // "+" irmão — abaixo do nó, horizontally centered
        bottom: { x: centerX, y: bottomRight.y + 10 },
      };
    } catch {
      return null;
    }
  }, [selectedNodes, getNodesBounds, flowToScreenPosition]);

  if (selectedNodes.length === 0 || !positions) return null;

  const isRoot = (selectedNodes[0]?.data as any)?.isRoot;

  return (
    <>
      {/* Botão filho — direita do nó */}
      <div
        className="absolute z-20 pointer-events-auto flex items-center gap-2"
        style={{ left: positions.right.x, top: positions.right.y, transform: "translateY(-50%)" }}
      >
        <button
          className="nodrag nopan flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-transform"
          onClick={onAddChild}
          title="Criar filho (Tab)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {/* Dicas de atalho */}
        <div className="flex flex-col gap-0.5 select-none pointer-events-none">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-muted/80 border border-border/60 text-[10px] font-mono font-medium leading-none">Tab</kbd>
            <span>criar tópico filho</span>
          </span>
          {!isRoot && onAddSibling && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-muted/80 border border-border/60 text-[10px] font-mono font-medium leading-none">Enter</kbd>
              <span>criar tópico irmão</span>
            </span>
          )}
        </div>
      </div>

      {/* Botão irmão — abaixo do nó (só para não-root) */}
      {!isRoot && onAddSibling && (
        <div
          className="absolute z-20 pointer-events-auto"
          style={{ left: positions.bottom.x, top: positions.bottom.y, transform: "translateX(-50%)" }}
        >
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-transform"
            onClick={onAddSibling}
            title="Criar irmão (Enter)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};

export default NodeFloatingToolbar;
