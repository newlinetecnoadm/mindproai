import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, Save, X, Users } from "lucide-react";

const AdminPlans = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

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

  // Count subscribers per plan
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
      const { display_name, price_brl, is_active, max_diagrams, max_boards, max_events, max_collaborators, export_pdf, ai_suggestions, list, id } = plan;
      const features = { max_diagrams, max_boards, max_events, max_collaborators, export_pdf, ai_suggestions, list };
      const { error } = await supabase
        .from("subscription_plans")
        .update({ display_name, price_brl, is_active, features })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
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
      max_collaborators: f.max_collaborators ?? 0,
      export_pdf: f.export_pdf ?? false,
      ai_suggestions: f.ai_suggestions ?? false,
      list: f.list ?? [],
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold mb-1">Planos & Assinaturas</h1>
        <p className="text-muted-foreground mb-8">Gerencie os planos disponíveis no sistema</p>

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
                        <div className="space-y-3 max-w-lg">
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
                                <Label className="text-xs">Colaboradores</Label>
                                <Input
                                  type="number"
                                  value={editValues.max_collaborators}
                                  onChange={(e) => setEditValues({ ...editValues, max_collaborators: parseInt(e.target.value) })}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>

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
                          <div className="flex gap-2">
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
                          </div>
                          <p className="text-2xl font-bold">
                            R$ {Number(plan.price_brl).toFixed(2).replace(".", ",")}
                            <span className="text-sm font-normal text-muted-foreground">/mês</span>
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {counts?.active ?? 0} ativos / {counts?.total ?? 0} total
                            </span>
                          </div>
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
