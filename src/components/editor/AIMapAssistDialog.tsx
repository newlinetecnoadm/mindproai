import { useState } from "react";
import { Bot, Sparkles, Search, Loader2, Plus, PenLine, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-map-assist`;

interface GeneratedNode {
  id: string;
  label: string;
  isRoot?: boolean;
}

interface GeneratedEdge {
  source: string;
  target: string;
}

interface Suggestion {
  type: "add" | "rename" | "restructure";
  parentId?: string;
  nodeId?: string;
  label?: string;
  newLabel?: string;
  description?: string;
  reason: string;
}

interface AnalysisResult {
  summary: string;
  suggestions: Suggestion[];
}

interface AIMapAssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagramType: string;
  nodes: Node[];
  edges: Edge[];
  onApplyGenerated: (nodes: GeneratedNode[], edges: GeneratedEdge[]) => void;
  onApplySuggestion: (suggestion: Suggestion) => void;
}

const AIMapAssistDialog = ({
  open,
  onOpenChange,
  diagramType,
  nodes,
  edges,
  onApplyGenerated,
  onApplySuggestion,
}: AIMapAssistDialogProps) => {
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Digite um tema para gerar o mapa.");
      return;
    }
    setGenerating(true);
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mode: "generate", topic: topic.trim(), diagramType }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro de conexão" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const data = await resp.json();
      if (data.nodes && data.edges) {
        onApplyGenerated(data.nodes, data.edges);
        toast.success("Mapa gerado com sucesso!");
        onOpenChange(false);
        setTopic("");
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar mapa");
    } finally {
      setGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (nodes.length === 0) {
      toast.error("O mapa está vazio. Adicione nós antes de analisar.");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setAppliedSuggestions(new Set());
    try {
      const simplifiedNodes = nodes.map((n) => ({
        id: n.id,
        label: (n.data as any)?.label || "sem label",
      }));
      const simplifiedEdges = edges.map((e) => ({
        source: e.source,
        target: e.target,
      }));

      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: "analyze",
          nodes: simplifiedNodes,
          edges: simplifiedEdges,
          diagramType,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro de conexão" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const data = await resp.json();
      if (data.summary && data.suggestions) {
        setAnalysis(data);
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao analisar mapa");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySuggestion = (suggestion: Suggestion, index: number) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions((prev) => new Set(prev).add(index));
    toast.success("Sugestão aplicada!");
  };

  const getSuggestionIcon = (type: string) => {
    if (type === "add") return <Plus className="w-3.5 h-3.5 text-emerald-500" />;
    if (type === "rename") return <PenLine className="w-3.5 h-3.5 text-blue-500" />;
    return <ArrowRight className="w-3.5 h-3.5 text-amber-500" />;
  };

  const getSuggestionLabel = (type: string) => {
    if (type === "add") return "Adicionar";
    if (type === "rename") return "Renomear";
    return "Reestruturar";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Assistente IA para Mapas
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generate" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Gerar Mapa
            </TabsTrigger>
            <TabsTrigger value="analyze" className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Analisar Mapa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Descreva o tema e a IA criará um mapa completo automaticamente.
            </p>
            <Input
              placeholder="Ex: Estratégia de marketing digital para e-commerce"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando mapa...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Mapa com IA
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Isso substituirá o mapa atual
            </p>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              A IA analisará seu mapa e sugerirá melhorias nos tópicos e na estrutura.
            </p>

            {!analysis && (
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || nodes.length === 0}
                className="w-full gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando mapa...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analisar Mapa Atual
                  </>
                )}
              </Button>
            )}

            {analysis && (
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Análise</p>
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </div>

                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sugestões ({analysis.suggestions.length})
                </p>

                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {analysis.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="mt-0.5">{getSuggestionIcon(s.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {getSuggestionLabel(s.type)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {s.type === "add" && s.label}
                          {s.type === "rename" && s.newLabel}
                          {s.type === "restructure" && s.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                      </div>
                      {s.type !== "restructure" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-7 text-xs"
                          disabled={appliedSuggestions.has(i)}
                          onClick={() => handleApplySuggestion(s, i)}
                        >
                          {appliedSuggestions.has(i) ? "✓" : "Aplicar"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full gap-1.5"
                >
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Analisar novamente
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AIMapAssistDialog;
