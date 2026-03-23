import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { diagramTypes, getTemplatesByType, templateCategories, type DiagramTemplate } from "@/data/templates";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import TemplateThumbnail from "@/components/editor/TemplateThumbnail";

const NewDiagram = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const limits = usePlanLimits();

  useEffect(() => {
    if (!limits.canCreateDiagram && !upgradeOpen) {
      setUpgradeOpen(true);
    }
  }, [limits.canCreateDiagram]);

  const allTemplates = selectedType ? getTemplatesByType(selectedType) : [];
  const templates = selectedCategory === "all"
    ? allTemplates
    : allTemplates.filter((t) => t.category === selectedCategory || !t.category);

  const isBlankTemplate = (tpl: DiagramTemplate) => tpl.name === "Em branco";

  const handleSelectTemplate = async (template: DiagramTemplate) => {
    if (!user || creating) return;
    setCreating(true);

    try {
      const diagramData: any = {
        nodes: template.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data as Record<string, unknown>,
        })) as unknown as any,
        edges: template.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          ...(e.label ? { label: e.label } : {}),
        })) as unknown as any,
        viewport: {},
      };

      const { data, error } = await supabase
        .from("diagrams")
        .insert({
          title: isBlankTemplate(template) ? "Sem título" : template.name,
          type: template.type as any,
          data: diagramData,
          user_id: user.id,
          template_id: template.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (isBlankTemplate(template)) {
        toast.info("💡 Dica rápida", {
          description: "Clique duas vezes no nó central para editar. Use Tab para criar ramificações e Enter para nós irmãos.",
          duration: 8000,
        });
      } else {
        toast.success("Diagrama criado!");
      }

      navigate(`/diagramas/${data.id}`, { replace: true });
    } catch (err: any) {
      toast.error("Erro ao criar: " + (err.message || "desconhecido"));
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectedType ? setSelectedType(null) : navigate("/diagramas")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">
              {selectedType ? "Escolha um template" : "Novo Diagrama"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {selectedType
                ? `${diagramTypes.find((t) => t.slug === selectedType)?.name} — selecione um template para começar`
                : "Selecione o tipo de diagrama que deseja criar"
              }
            </p>
          </div>
        </div>

        {/* Type Selection or Template Selection */}
        {!selectedType ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {diagramTypes.map((type) => (
              <Card
                key={type.slug}
                className="cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all group relative overflow-hidden bg-card"
                onClick={() => setSelectedType(type.slug)}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                    {type.icon}
                  </div>
                  <h3 className="font-bold text-2xl mb-3 tracking-tight">{type.name}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-[280px]">
                    {type.description}
                  </p>
                  <Button variant="outline" className="mt-8 px-8 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Criar Agora
                  </Button>
                </CardContent>
                {/* Subtle highlight effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                className={cn(
                  "cursor-pointer hover:border-primary/40 hover:shadow-md transition-all",
                  creating && "opacity-50 pointer-events-none"
                )}
                onClick={() => handleSelectTemplate(tpl)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="h-20 sm:h-24 bg-muted/50 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                    <TemplateThumbnail template={tpl} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                  {tpl.category && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {templateCategories.find(c => (c as any).id === tpl.category)?.name || tpl.category}
                    </span>
                  )}
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
