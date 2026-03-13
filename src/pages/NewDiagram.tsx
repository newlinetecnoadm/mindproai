import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { diagramTypes, getTemplatesByType, type DiagramTemplate } from "@/data/templates";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import TemplateThumbnail from "@/components/editor/TemplateThumbnail";

const NewDiagram = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const limits = usePlanLimits();

  // Redirect if over limit
  useEffect(() => {
    if (!limits.canCreateDiagram && !upgradeOpen) {
      setUpgradeOpen(true);
    }
  }, [limits.canCreateDiagram]);

  const templates = selectedType ? getTemplatesByType(selectedType) : [];

  const handleSelectTemplate = async (template: DiagramTemplate) => {
    if (!user || creating) return;
    setCreating(true);

    try {
      const diagramData: Json = {
        nodes: template.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data as Record<string, unknown>,
        })) as unknown as Json,
        edges: template.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          ...(e.label ? { label: e.label } : {}),
        })) as unknown as Json,
        viewport: {},
      };

      const { data, error } = await supabase
        .from("diagrams")
        .insert({
          title: template.name === "Em branco" ? "Sem título" : template.name,
          type: template.type as any,
          data: diagramData,
          user_id: user.id,
          template_id: template.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Diagrama criado!");
      navigate(`/diagramas/${data.id}`, { replace: true });
    } catch (err: any) {
      toast.error("Erro ao criar: " + (err.message || "desconhecido"));
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectedType ? setSelectedType(null) : navigate("/diagramas")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {selectedType ? "Escolha um template" : "Novo Diagrama"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {selectedType
                ? `${diagramTypes.find((t) => t.slug === selectedType)?.name} — selecione um template para começar`
                : "Selecione o tipo de diagrama que deseja criar"
              }
            </p>
          </div>
        </div>

        {!selectedType ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {diagramTypes.map((t) => (
              <Card
                key={t.slug}
                className="group cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                onClick={() => setSelectedType(t.slug)}
              >
                <CardContent className="p-6">
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <h3 className="font-semibold text-base mb-1">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <ArrowRight className="w-4 h-4 text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                className={cn(
                  "cursor-pointer hover:border-primary/40 hover:shadow-md transition-all",
                  creating && "opacity-50 pointer-events-none"
                )}
                onClick={() => handleSelectTemplate(tpl)}
              >
                <CardContent className="p-5">
                  <div className="h-24 bg-muted rounded-lg mb-3 flex items-center justify-center text-xs text-muted-foreground">
                    {tpl.nodes.length} nós · {tpl.edges.length} conexões
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground">{tpl.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={(open) => {
          setUpgradeOpen(open);
          if (!open) navigate("/diagramas");
        }}
        resource="diagrama"
        currentCount={limits.currentDiagrams}
        maxCount={limits.maxDiagrams}
        planName={limits.displayName}
      />
    </DashboardLayout>
  );
};

export default NewDiagram;
