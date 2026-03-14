import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Camera, Loader2, Bell, Kanban, Brain, CalendarDays } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface NotificationPref {
  key: string;
  label: string;
  description: string;
}

interface NotificationModule {
  id: string;
  label: string;
  icon: React.ElementType;
  prefs: NotificationPref[];
}

const NOTIFICATION_MODULES: NotificationModule[] = [
  {
    id: "boards",
    label: "Boards",
    icon: Kanban,
    prefs: [
      { key: "notify_comments", label: "Comentários em cards", description: "Quando alguém comentar em um card dos seus boards." },
      { key: "notify_card_moved", label: "Card movido", description: "Quando um card for movido entre colunas." },
      { key: "notify_due_soon", label: "Prazo próximo", description: "Quando a data de entrega de um card estiver a menos de 24h." },
      { key: "notify_member_added", label: "Adicionado como membro", description: "Quando for adicionado como membro de um card." },
      { key: "notify_board_card_assigned", label: "Card atribuído", description: "Quando um card for atribuído a você." },
      { key: "notify_board_checklist_done", label: "Checklist concluída", description: "Quando todas as tarefas de uma checklist forem concluídas." },
      { key: "notify_board_label_changed", label: "Label alterada", description: "Quando uma label for adicionada ou removida de um card seu." },
    ],
  },
  {
    id: "diagrams",
    label: "Diagramas",
    icon: Brain,
    prefs: [
      { key: "notify_diagram_shared", label: "Diagrama compartilhado", description: "Quando alguém compartilhar um diagrama com você." },
      { key: "notify_diagram_commented", label: "Comentário em diagrama", description: "Quando alguém comentar em um diagrama seu." },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    prefs: [
      { key: "notify_agenda_reminders", label: "Lembretes de eventos", description: "Receber lembrete antes de eventos agendados." },
      { key: "notify_agenda_event_updated", label: "Evento atualizado", description: "Quando um evento compartilhado for alterado." },
    ],
  },
];

const Configuracoes = () => {
  const { user } = useAuth();
  const { data: planInfo } = usePlan();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const allPrefKeys = NOTIFICATION_MODULES.flatMap((m) => m.prefs.map((p) => p.key));
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(allPrefKeys.map((k) => [k, true]))
  );

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setBirthDate((profile as any).birth_date || "");
      const p = profile as any;
      const newPrefs: Record<string, boolean> = {};
      for (const key of allPrefKeys) {
        newPrefs[key] = p[key] ?? true;
      }
      setPrefs(newPrefs);
    }
  }, [profile]);

  const handleTogglePref = async (key: string, checked: boolean) => {
    const prev = prefs[key];
    setPrefs((p) => ({ ...p, [key]: checked }));
    const { error } = await supabase
      .from("user_profiles")
      .update({ [key]: checked } as any)
      .eq("user_id", user!.id);
    if (error) {
      toast.error("Erro ao salvar preferência");
      setPrefs((p) => ({ ...p, [key]: prev }));
    } else {
      toast.success(checked ? "Notificação ativada" : "Notificação desativada");
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates: any = { full_name: name.trim() };
    if (birthDate) updates.birth_date = birthDate;
    else updates.birth_date = null;
    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Perfil atualizado!");
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB"); return; }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("card-attachments").upload(path, file, { upsert: true });
    if (uploadError) { setUploadingAvatar(false); toast.error("Erro ao enviar imagem"); return; }
    const { data: urlData } = supabase.storage.from("card-attachments").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("user_profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (updateError) { toast.error("Erro ao atualizar avatar"); }
    else { toast.success("Avatar atualizado!"); queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] }); }
  };

  const displayName = profile?.full_name || profile?.email || "";
  const displayEmail = profile?.email || user?.email || "";
  const avatarUrl = profile?.avatar_url;
  const trialDays = planInfo?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(planInfo.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <DashboardLayout>
      <PageTransition className="p-6 lg:p-8 max-w-3xl">
        <h1 className="text-2xl font-display font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground mb-8">Gerencie sua conta e preferências</p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-muted">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" /> Notificações
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2">
                <CreditCard className="w-4 h-4" /> Plano & Billing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                        {displayName.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                  <div>
                    <p className="font-semibold">{displayName || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{displayEmail}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-email">E-mail</Label>
                    <Input id="settings-email" value={displayEmail} disabled className="bg-muted" />
                  </div>
                </div>
                <Button variant="hero" onClick={handleSave} disabled={saving || name.trim() === (profile?.full_name || "")}>
                  {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</>) : "Salvar Alterações"}
                </Button>
              </div>
              <div className="p-6 rounded-xl border border-destructive/30 bg-card">
                <h3 className="font-semibold text-destructive mb-2">Zona de Perigo</h3>
                <p className="text-sm text-muted-foreground mb-4">Excluir sua conta permanentemente. Esta ação não pode ser desfeita.</p>
                <Button variant="destructive" size="sm">Excluir Conta</Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card space-y-2">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Notificações</h3>
                  <p className="text-sm text-muted-foreground">Configure quais notificações deseja receber por módulo.</p>
                </div>

                {NOTIFICATION_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div key={mod.id} className="space-y-2">
                      <div className="flex items-center gap-2 pt-3 pb-1">
                        <Icon className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold">{mod.label}</h4>
                      </div>
                      <div className="space-y-1">
                        {mod.prefs.map((pref) => (
                          <div key={pref.key} className="flex items-center justify-between py-3 px-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                            <div className="space-y-0.5 pr-4">
                              <p className="text-sm font-medium">{pref.label}</p>
                              <p className="text-xs text-muted-foreground">{pref.description}</p>
                            </div>
                            <Switch
                              checked={prefs[pref.key] ?? true}
                              onCheckedChange={(checked) => handleTogglePref(pref.key, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4">Plano Atual</h3>
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent">
                  <div>
                    <p className="font-bold">{planInfo?.displayName || "Gratuito"}</p>
                    {planInfo?.status === "trialing" && trialDays !== null && (
                      <p className="text-sm text-muted-foreground">{trialDays > 0 ? `${trialDays} dias restantes` : "Trial expirado"}</p>
                    )}
                    {planInfo?.status === "active" && <p className="text-sm text-muted-foreground">Ativo</p>}
                  </div>
                  <Button variant="hero" size="sm" onClick={() => navigate("/assinaturas")}>
                    {planInfo?.planName === "free" ? "Upgrade" : "Gerenciar"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </PageTransition>
    </DashboardLayout>
  );
};

export default Configuracoes;
