import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface GeneratedColumn {
  title: string;
  cards: { title: string; description?: string }[];
}

interface AIBoardAssistDialogProps {
  boardId: string;
  onApply: (columns: GeneratedColumn[]) => Promise<void>;
}

const SUGGESTIONS = [
  "Lançamento de produto digital",
  "Sprint de desenvolvimento de software",
  "Planejamento de evento corporativo",
  "Campanha de marketing digital",
  "Onboarding de novos funcionários",
];

export default function AIBoardAssistDialog({ boardId, onApply }: AIBoardAssistDialogProps) {
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<GeneratedColumn[] | null>(null);

  const handleGenerate = async () => {
    if (!objective.trim()) return;
    setLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-board-assist", {
        body: { objective: objective.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data?.columns || !Array.isArray(data.columns)) {
        throw new Error("Formato de resposta inválido");
      }

      setPreview(data.columns);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar board com IA");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      await onApply(preview);
      toast.success("Board gerado com IA aplicado com sucesso!");
      setOpen(false);
      setPreview(null);
      setObjective("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao aplicar estrutura");
    } finally {
      setLoading(false);
    }
  };

  const totalCards = preview?.reduce((sum, col) => sum + col.cards.length, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreview(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Gerar Board com IA
          </DialogTitle>
          <DialogDescription>
            Descreva seu objetivo ou projeto e a IA criará colunas e cards automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Ex: Organizar o lançamento de um app mobile com marketing, desenvolvimento e testes..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              className="resize-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setObjective(s)}
                  className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !objective.trim()}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Estrutura
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{preview.length} colunas</Badge>
              <Badge variant="secondary">{totalCards} cards</Badge>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {preview.map((col, i) => (
                <div key={i} className="rounded-lg border border-border p-3 bg-secondary/30">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{col.title}</h4>
                  {col.cards.length > 0 ? (
                    <ul className="space-y-1">
                      {col.cards.map((card, j) => (
                        <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                          <div>
                            <span className="text-foreground">{card.title}</span>
                            {card.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{card.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sem cards</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPreview(null)}>
                Voltar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleApply} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  "Aplicar ao Board"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
