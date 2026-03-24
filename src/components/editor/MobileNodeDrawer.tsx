import { Node } from "@xyflow/react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  Type, 
  Trash2, 
  Copy, 
  Plus, 
  ArrowRight, 
  Sparkles
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MobileNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: Node | null;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onColorChange: (color: string) => void;
  onShapeChange?: (shape: string) => void;
  onVariantChange?: (variant: string) => void;
  onAIAssist?: () => void;
  diagramType: string;
}

const MobileNodeDrawer = ({
  isOpen,
  onClose,
  node,
  onDelete,
  onDuplicate,
  onAddChild,
  onAddSibling,
  onColorChange,
  onShapeChange,
  onVariantChange,
  onAIAssist,
  diagramType
}: MobileNodeDrawerProps) => {
  if (!node) return null;

  const nodeLabel = (node.data as any)?.label || "Nó";
  const isMindmap = diagramType === "mindmap" || diagramType === "orgchart";

  const colors = ["blue", "green", "purple", "red", "yellow", "orange", "gray"];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="px-4 pb-8 max-h-[85vh]">
        <DrawerHeader className="px-0">
          <DrawerTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            <span className="truncate">{nodeLabel}</span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Main Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 flex-col gap-1 rounded-2xl border-primary/20 bg-primary/5 text-primary" onClick={() => { onAddChild(); onClose(); }}>
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Novo Filho</span>
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1 rounded-2xl border-primary/20 bg-primary/5 text-primary" onClick={() => { onAddSibling(); onClose(); }}>
              <ArrowRight className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Novo Irmão</span>
            </Button>
          </div>

          <Separator />

          {/* Quick Tools */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
               Ferramentas
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="ghost" className="h-12 flex-col gap-1 rounded-xl" onClick={onDuplicate}>
                <Copy className="w-4 h-4" />
                <span className="text-[10px]">Duplicar</span>
              </Button>
              {onAIAssist && (
                <Button variant="ghost" className="h-12 flex-col gap-1 rounded-xl text-orange-500" onClick={onAIAssist}>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px]">AI Pro</span>
                </Button>
              )}
              <Button variant="ghost" className="h-12 flex-col gap-1 rounded-xl text-destructive" onClick={() => { onDelete(); onClose(); }}>
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px]">Excluir</span>
              </Button>
            </div>
          </div>

          </div>
        </DrawerContent>
      </Drawer>
  );
};

export default MobileNodeDrawer;
