import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Globe, Shield, CreditCard, Bot, Save, Loader2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PROVIDERS = [
  { value: "lovable", label: "Mind Pro AI (padrão)", description: "Integrado, sem chave necessária" },
  { value: "openai", label: "OpenAI", description: "GPT-4o, GPT-4o-mini, etc." },
  { value: "gemini", label: "Google Gemini", description: "Gemini Pro, Flash, etc." },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  lovable: [
    { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (recomendado)" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { value: "openai/gpt-5", label: "GPT-5" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (econômico)" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
};

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("lovable");
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || "lovable");
      setModel(settings.model || "google/gemini-3-flash-preview");
      setIsActive(settings.is_active ?? true);
      setApiKey("");
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        provider,
        model,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };
      if (provider !== "lovable" && apiKey) {
        payload.api_key_encrypted = apiKey;
      }
      if (provider === "lovable") {
        payload.api_key_encrypted = null;
      }

      if (settings?.id) {
        const { error } = await supabase
          .from("ai_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("Configurações de IA salvas");
      setApiKey("");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const availableModels = MODELS[provider] ?? [];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground mb-8">Gerencie integrações e chaves de API</p>

        {/* AI Settings */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Inteligência Artificial</h3>
                <p className="text-sm text-muted-foreground">Configure o provedor de IA do chat e assistente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="ai-active" className="text-xs text-muted-foreground">Ativo</Label>
              <Switch id="ai-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 max-w-lg">
              <div>
                <Label className="text-xs">Provedor</Label>
                <Select value={provider} onValueChange={(v) => {
                  setProvider(v);
                  setModel(MODELS[v]?.[0]?.value ?? "");
                  setApiKey("");
                }}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex flex-col">
                          <span>{p.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {PROVIDERS.find((p) => p.value === provider)?.description}
                </p>
              </div>

              <div>
                <Label className="text-xs">Modelo</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {provider !== "lovable" && (
                <div>
                  <Label className="text-xs">Chave de API</Label>
                  <Input
                    type="password"
                    placeholder={provider === "openai" ? "sk-..." : "AIza..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="h-9 mt-1 font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings?.api_key_encrypted ? (
                      <span className="flex items-center gap-1 text-success">
                        <Check className="w-3 h-3" /> Chave configurada
                      </span>
                    ) : (
                      "Nenhuma chave configurada"
                    )}
                  </p>
                </div>
              )}

              {provider === "lovable" && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Mind Pro AI</strong> está integrado automaticamente. Nenhuma chave é necessária.
                    O sistema usa créditos inclusos no plano.
                  </p>
                </div>
              )}

              <Button
                variant="hero"
                size="sm"
                className="text-xs gap-1"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar Configuração
              </Button>
            </div>
          )}
        </div>

        {/* Other configs */}
        <div className="space-y-4">
          {[
            {
              title: "Stripe",
              description: "Gateway de pagamento para assinaturas",
              icon: CreditCard,
              status: "ativo",
            },
            {
              title: "Google OAuth",
              description: "Login social com Google",
              icon: Globe,
              status: "ativo",
            },
          ].map((config) => (
            <div key={config.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <config.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{config.title}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20"
                >
                  {config.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic mt-3">Configuração gerenciada automaticamente.</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
