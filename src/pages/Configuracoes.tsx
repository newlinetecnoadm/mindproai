import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Camera, Loader2, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Configuracoes = () => {
  const { user } = useAuth();
  const { data: planInfo } = usePlan();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({ full_name: name.trim() })
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

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("card-attachments")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      toast.error("Erro ao enviar imagem");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("card-attachments")
      .getPublicUrl(path);

    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    setUploadingAvatar(false);
    if (updateError) {
      toast.error("Erro ao atualizar avatar");
    } else {
      toast.success("Avatar atualizado!");
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
    }
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
              <TabsTrigger value="billing" className="gap-2">
                <CreditCard className="w-4 h-4" /> Plano & Billing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card space-y-6">
                {/* Avatar + info */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full object-cover border-2 border-border"
                      />
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
                      {uploadingAvatar ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{displayName || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{displayEmail}</p>
                  </div>
                </div>

                {/* Edit fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-email">E-mail</Label>
                    <Input
                      id="settings-email"
                      value={displayEmail}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <Button
                  variant="hero"
                  onClick={handleSave}
                  disabled={saving || name.trim() === (profile?.full_name || "")}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>

              <div className="p-6 rounded-xl border border-destructive/30 bg-card">
                <h3 className="font-semibold text-destructive mb-2">Zona de Perigo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Excluir sua conta permanentemente. Esta ação não pode ser desfeita.
                </p>
                <Button variant="destructive" size="sm">
                  Excluir Conta
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4">Plano Atual</h3>
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent">
                  <div>
                    <p className="font-bold">{planInfo?.displayName || "Gratuito"}</p>
                    {planInfo?.status === "trialing" && trialDays !== null && (
                      <p className="text-sm text-muted-foreground">
                        {trialDays > 0 ? `${trialDays} dias restantes` : "Trial expirado"}
                      </p>
                    )}
                    {planInfo?.status === "active" && (
                      <p className="text-sm text-muted-foreground">Ativo</p>
                    )}
                  </div>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => navigate("/assinaturas")}
                  >
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
