import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Import } from "lucide-react";

interface ImportOutlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (text: string) => void;
}

export function ImportOutlineDialog({ open, onOpenChange, onImport }: ImportOutlineDialogProps) {
  const [text, setText] = useState("");

  const handleImport = () => {
    if (!text.trim()) return;
    onImport(text);
    setText("");
    onOpenChange(false);
  };

  const exampleOutline = `Marketing Digital
  SEO
    On-page
    Off-page
  Conteúdo
    Blog posts
    E-books
  Redes Sociais
    Instagram
    LinkedIn`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Importar Esboço</DialogTitle>
              <DialogDescription>
                Cole uma estrutura hierárquica usando espaços ou tabs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted p-2 rounded text-[10px] text-muted-foreground whitespace-pre font-mono">
            {exampleOutline}
          </div>
          <Textarea
            placeholder="Cole seu esboço aqui..."
            className="min-h-[250px] font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!text.trim()} className="gap-2">
            <Import className="w-4 h-4" />
            Importar e Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
