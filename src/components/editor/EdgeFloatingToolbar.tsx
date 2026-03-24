import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { Trash2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const edgeColors = [
  { name: "Padrão", value: undefined, class: "bg-muted-foreground/40" },
  { name: "Azul", value: "#4472C4", class: "bg-[#4472C4]" },
  { name: "Verde", value: "#70AD47", class: "bg-[#70AD47]" },
  { name: "Roxo", value: "#7B5EA7", class: "bg-[#7B5EA7]" },
  { name: "Vermelho", value: "#C0392B", class: "bg-[#C0392B]" },
  { name: "Amarelo", value: "#D4AC0D", class: "bg-[#D4AC0D]" },
  { name: "Laranja", value: "#E9853A", class: "bg-[#E9853A]" },
];

interface EdgeFloatingToolbarProps {
  selectedEdge: Edge | null;
  onDelete: (edgeId: string) => void;
  onColorChange: (edgeId: string, color: string | undefined) => void;
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

const EdgeFloatingToolbar = ({
  selectedEdge,
  onDelete,
  onColorChange,
}: EdgeFloatingToolbarProps) => {
  const { flowToScreenPosition, getNode } = useReactFlow();

  const position = useMemo(() => {
    if (!selectedEdge) return null;
    try {
      const sourceNode = getNode(selectedEdge.source);
      const targetNode = getNode(selectedEdge.target);
      
      if (!sourceNode || !targetNode) return null;

      // Calculate midpoint between nodes
      // React Flow positions are top-left, so we add midpoints of dimensions if available
      const sX = sourceNode.position.x + (sourceNode.measured?.width ?? 100) / 2;
      const sY = sourceNode.position.y + (sourceNode.measured?.height ?? 40) / 2;
      const tX = targetNode.position.x + (targetNode.measured?.width ?? 100) / 2;
      const tY = targetNode.position.y + (targetNode.measured?.height ?? 40) / 2;

      const midX = (sX + tX) / 2;
      const midY = (sY + tY) / 2;

      const screenPos = flowToScreenPosition({ x: midX, y: midY });
      return { x: screenPos.x, y: screenPos.y };
    } catch {
      return null;
    }
  }, [selectedEdge, getNode, flowToScreenPosition]);

  if (!selectedEdge || !position) return null;

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 bg-card border border-border rounded-lg px-1 py-1 shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{ left: position.x, top: position.y }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <TipButton variant="ghost" size="icon" className="h-7 w-7" label="Trocar Cor">
              <Palette className="w-3.5 h-3.5" />
            </TipButton>
          </span>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" className="w-40 p-2">
          <div className="grid grid-cols-4 gap-1">
            {edgeColors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => onColorChange(selectedEdge.id, c.value)}
                className={cn(
                  "w-7 h-7 rounded-full border border-black/10 transition-transform hover:scale-110",
                  c.class
                )}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-4 bg-border mx-0.5" />

      <TipButton
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => onDelete(selectedEdge.id)}
        label="Excluir Conexão"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </TipButton>
    </div>
  );
};

export default EdgeFloatingToolbar;
