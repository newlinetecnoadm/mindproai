import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, Save, X, Users, Plus, Trash2, GripVertical } from "lucide-react";

const AdminPlans = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "",
    display_name: "",
    price_brl: 0,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_brl");
      if (error) throw error;
      return data;
    },
  });

  const { data: subCounts } = useQuery({
    queryKey: ["admin-sub-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_id, status");
      if (error) throw error;
      const counts: Record<string, { total: number; active: number }> = {};
      for (const s of data) {
        if (!counts[s.plan_id]) counts[s.plan_id] = { total: 0, active: 0 };
        counts[s.plan_id].total++;
        if (s.status === "active" || s.status === "trialing") counts[s.plan_id].active++;
      }
      return counts;
    },
  });

  const updatePlanMut = useMutation({
    mutationFn: async (plan: any) => {
      const {
        display_name, price_brl, is_active,
        max_diagrams, max_boards, max_events, max_guests_per_project,
        export_pdf, ai_suggestions, list, description, cta_text, is_highlighted,
        id,
      } = plan;
      const features = {
        max_diagrams, max_boards, max_events, max_guests_per_project,
        export_pdf, ai_suggestions, list, description, cta_text, is_highlighted,
      };
      const { error } = await supabase
        .from("subscription_plans")
        .update({ display_name, price_brl, is_active, features })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setEditingId(null);
      toast.success("Plano atualizado");
    },
    onError: () => toast.error("Erro ao atualizar plano"),
  });

  const startEdit = (plan: any) => {
    const f = plan.features ?? {};
    setEditingId(plan.id);
    setEditValues({
      display_name: plan.display_name,
      price_brl: plan.price_brl,
      is_active: plan.is_active,
      max_diagrams: f.max_diagrams ?? 3,
      max_boards: f.max_boards ?? 2,
      max_events: f.max_events ?? 10,
      max_guests_per_project: f.max_guests_per_project ?? f.max_collaborators ?? 0,
      export_pdf: f.export_pdf ?? false,
      ai_suggestions: f.ai_suggestions ?? false,
      list: f.list ?? [],
      description: f.description ?? "",
      cta_text: f.cta_text ?? "",
      is_highlighted: f.is_highlighted ?? false,
    });
  };

  const addFeatureItem = () => {
    setEditValues({ ...editValues, list: [...(editValues.list || []), ""] });
  };

  const updateFeatureItem = (index: number, value: string) => {
    const newList = [...editValues.list];
    newList[index] = value;
    setEditValues({ ...editValues, list: newList });
  };

  const removeFeatureItem = (index: number) => {
    const newList = editValues.list.filter((_: any, i: number) => i !== index);
    setEditValues({ ...editValues, list: newList });
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold mb-1">Planos & Assinaturas</h1>
        <p className="text-muted-foreground mb-2">Gerencie os planos disponíveis no sistema</p>
        <p className="text-xs text-muted-foreground/70 mb-8">
          As alterações aqui refletem automaticamente na landing page, página de assinaturas e limites dos usuários.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {plans?.map((plan: any) => {
              const isEditing = editingId === plan.id;
              const counts = subCounts?.[plan.id];

              return (
                <div key={plan.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4 max-w-xl">
                          {/* Basic info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome exibido</Label>
                              <Input
                                value={editValues.display_name}
                                onChange={(e) => setEditValues({ ...editValues, display_name: e.target.value })}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Preço (BRL)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.price_brl}
                                onChange={(e) => setEditValues({ ...editValues, price_brl: parseFloat(e.target.value) })}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {/* Display metadata */}
                          <div className="border-t border-border pt-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Exibição (Landing Page & Assinaturas)</p>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Descrição curta</Label>
                                <Input
                                  value={editValues.description}
                                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                  placeholder="Ex: Para profissionais"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Texto do botão (CTA)</Label>
                                <Input
                                  value={editValues.cta_text}
                                  onChange={(e) => setEditValues({ ...editValues, cta_text: e.target.value })}
                                  placeholder="Ex: Assinar Pro"
                                  className="h-9"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={editValues.is_highlighted}
                                  onCheckedChange={(v) => setEditValues({ ...editValues, is_highlighted: v })}
                                />
                                <Label className="text-xs">Destacar como "Recomendado"</Label>
                              </div>
                            </div>
                          </div>

                          {/* Limits */}
                          <div className="border-t border-border pt-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Limites (-1 = ilimitado)</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Mapas mentais</Label>
                                <Input
                                  type="number"
                                  value={editValues.max_diagrams}
                                  onChange={(e) => setEditValues({ ...editValues, max_diagrams: parseInt(e.target.value) })}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Boards</Label>
                                <Input
                                  type="number"
                                  value={editValues.max_boards}
                                  onChange={(e) => setEditValues({ ...editValues, max_boards: parseInt(e.target.value) })}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Eventos/mês</Label>
                                <Input
                                  type="number"
                                  value={editValues.max_events}
                                  onChange={(e) => setEditValues({ ...editValues, max_events: parseInt(e.target.value) })}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Convidados/projeto</Label>
                                <Input
                                  type="number"
                                  value={editValues.max_guests_per_project}
                                  onChange={(e) => setEditValues({ ...editValues, max_guests_per_project: parseInt(e.target.value) })}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Features toggles */}
                          <div className="border-t border-border pt-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Recursos</p>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editValues.export_pdf}
                                  onChange={(e) => setEditValues({ ...editValues, export_pdf: e.target.checked })}
                                  className="rounded border-border"
                                />
                                Exportar PDF
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editValues.ai_suggestions}
                                  onChange={(e) => setEditValues({ ...editValues, ai_suggestions: e.target.checked })}
                                  className="rounded border-border"
                                />
                                Sugestões IA
                              </label>
                            </div>
                          </div>

                          {/* Feature list editor */}
                          <div className="border-t border-border pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lista de benefícios (exibida nos cards)</p>
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addFeatureItem}>
                                <Plus className="w-3 h-3" /> Adicionar
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(editValues.list ?? []).map((item: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                                  <Input
                                    value={item}
                                    onChange={(e) => updateFeatureItem(idx, e.target.value)}
                                    placeholder="Ex: Diagramas ilimitados"
                                    className="h-8 text-sm"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0 text-destructive/60 hover:text-destructive"
                                    onClick={() => removeFeatureItem(idx)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                              {(editValues.list ?? []).length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Nenhum item. Clique em "Adicionar" para incluir benefícios visíveis nos cards de plano.</p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="hero"
                              className="h-8 text-xs gap-1"
                              onClick={() => updatePlanMut.mutate({ id: plan.id, ...editValues })}
                            >
                              <Save className="w-3.5 h-3.5" /> Salvar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{plan.display_name}</h3>
                            <Badge variant="outline" className="text-xs">{plan.name}</Badge>
                            {!plan.is_active && (
                              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                                Inativo
                              </Badge>
                            )}
                            {(plan.features as any)?.is_highlighted && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                Destaque
                              </Badge>
                            )}
                          </div>
                          <p className="text-2xl font-bold">
                            R$ {Number(plan.price_brl).toFixed(2).replace(".", ",")}
                            <span className="text-sm font-normal text-muted-foreground">/mês</span>
                          </p>
                          {(plan.features as any)?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{(plan.features as any).description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {counts?.active ?? 0} ativos / {counts?.total ?? 0} total
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {(() => {
                              const f = plan.features ?? {};
                              const fmt = (v: number) => v === -1 ? "∞" : v;
                              return (
                                <>
                                  <Badge variant="secondary" className="text-xs">{fmt((f as any).max_diagrams ?? 3)} mapas</Badge>
                                  <Badge variant="secondary" className="text-xs">{fmt((f as any).max_boards ?? 2)} boards</Badge>
                                  <Badge variant="secondary" className="text-xs">{fmt((f as any).max_events ?? 10)} eventos/mês</Badge>
                                  <Badge variant="secondary" className="text-xs">{fmt((f as any).max_guests_per_project ?? 0)} convidados/projeto</Badge>
                                  {(f as any).export_pdf && <Badge variant="secondary" className="text-xs">PDF</Badge>}
                                  {(f as any).ai_suggestions && <Badge variant="secondary" className="text-xs">IA</Badge>}
                                </>
                              );
                            })()}
                          </div>
                          {((plan.features as any)?.list ?? []).length > 0 && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              <p className="font-medium mb-1">Benefícios exibidos:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {((plan.features as any).list as string[]).map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(plan)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
