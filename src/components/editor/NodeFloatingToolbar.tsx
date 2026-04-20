import { useMemo, type RefObject } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Plus } from "lucide-react";

interface NodeFloatingToolbarProps {
  containerRef: RefObject<HTMLDivElement>;
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
  containerRef,
  selectedNodes,
  onAddChild,
  onAddSibling,
}: NodeFloatingToolbarProps) => {
  const { getNodesBounds, flowToScreenPosition } = useReactFlow();
  // Subscribe to viewport so positions recalculate on pan/zoom
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();

  const positions = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    try {
      const bounds = getNodesBounds(selectedNodes);
      const topLeft = flowToScreenPosition({ x: bounds.x, y: bounds.y });
      const bottomRight = flowToScreenPosition({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });

      // Subtract canvas container offset so absolute positioning is correct
      const containerRect = containerRef.current?.getBoundingClientRect();
      const ox = containerRect?.left ?? 0;
      const oy = containerRect?.top ?? 0;

      const left = topLeft.x - ox;
      const right = bottomRight.x - ox;
      const top = topLeft.y - oy;
      const bottom = bottomRight.y - oy;
      const centerX = (left + right) / 2;
      const midY = (top + bottom) / 2;

      return { left, right, top, bottom, centerX, midY };
    } catch {
      return null;
    }
  // vpX/vpY/vpZoom in deps so the memo re-runs on every pan/zoom
  }, [selectedNodes, getNodesBounds, flowToScreenPosition, containerRef, vpX, vpY, vpZoom]);

  if (selectedNodes.length === 0 || !positions) return null;

  const nodeData = selectedNodes[0]?.data as any;
  const isRoot = nodeData?.isRoot;
  const isLeftSide = nodeData?.side === "left";

  const { left, right, top, bottom, centerX, midY } = positions;

  return (
    <>
      {/* Botão filho — ao lado do nó (direita para side=right, esquerda para side=left) */}
      {isLeftSide ? (
        <div
          className="absolute z-20 pointer-events-auto flex items-center gap-2"
          style={{ left: left - 10, top: midY, transform: "translate(-100%, -50%)" }}
        >
          {/* Hint labels (à direita do botão, ou seja, entre o botão e o nó) */}
          <div className="flex flex-col gap-0.5 select-none pointer-events-none items-end">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>criar tópico filho</span>
              <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-muted/80 border border-border/60 text-[10px] font-mono font-medium leading-none">Tab</kbd>
            </span>
            {!isRoot && onAddSibling && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>criar tópico irmão</span>
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-muted/80 border border-border/60 text-[10px] font-mono font-medium leading-none">Enter</kbd>
              </span>
            )}
          </div>
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-transform"
            onClick={onAddChild}
            title="Criar filho (Tab)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="absolute z-20 pointer-events-auto flex items-center gap-2"
          style={{ left: right + 10, top: midY, transform: "translateY(-50%)" }}
        >
          <button
            className="nodrag nopan flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-transform"
            onClick={onAddChild}
            title="Criar filho (Tab)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
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
      )}

      {/* Botão irmão — abaixo do nó (só para não-root) */}
      {!isRoot && onAddSibling && (
        <div
          className="absolute z-20 pointer-events-auto"
          style={{ left: centerX, top: bottom + 10, transform: "translateX(-50%)" }}
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
