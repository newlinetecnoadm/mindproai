import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const PLAN_PRICE_MAP: Record<string, string> = {
  pro: "price_1TAXMiEXDv2crum3SeNjqH89",
  business: "price_1TAXNPEXDv2crum3gSZmhaq0",
};

const AssinaturasPage = () => {
  const { data: currentPlan, isLoading: planLoading } = usePlan();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Assinatura realizada com sucesso!");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout cancelado.");
    }
  }, [searchParams]);

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_brl");
      if (error) throw error;
      return data;
    },
  });

  const handleCheckout = async (planName: string) => {
    const priceId = PLAN_PRICE_MAP[planName];
    if (!priceId) return;

    setLoadingPlan(planName);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Use o portal para cancelar sua assinatura e retornar ao plano gratuito.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir portal de cancelamento");
    } finally {
      setCancelLoading(false);
      setCancelDialogOpen(false);
    }
  };

  const currentPlanName = currentPlan?.planName ?? "free";
  const trialDays = currentPlan?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(currentPlan.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <h1 className="text-2xl font-display font-bold mb-1">Assinaturas</h1>
        <p className="text-muted-foreground mb-8">Gerencie seu plano e cobrança</p>

        {/* Current plan banner */}
        <div className="p-5 rounded-xl border border-primary/30 bg-accent mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-accent-foreground/70">Plano atual</p>
            <p className="font-display font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> {currentPlan?.displayName ?? "Gratuito"}
            </p>
            {currentPlan?.status === "trialing" && trialDays > 0 && (
              <p className="text-sm text-muted-foreground">{trialDays} dias restantes de trial</p>
            )}
            {currentPlan?.status === "active" && (
              <p className="text-sm text-muted-foreground">Assinatura ativa</p>
            )}
          </div>
          <div className="flex gap-2">
            {currentPlanName !== "free" && currentPlan?.status === "active" && (
              <>
                <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Gerenciar
                </Button>
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCancelDialogOpen(true)}>
                  Cancelar Plano
                </Button>
              </>
            )}
            {currentPlanName === "free" && <Button variant="hero">Fazer Upgrade</Button>}
          </div>
        </div>

        {/* Plans - Dynamic from DB */}
        <div className="grid md:grid-cols-3 gap-6">
          {(plans ?? []).map((plan: any) => {
            const isCurrent = currentPlanName === plan.name;
            const f = (plan.features ?? {}) as any;
            const isHighlighted = f.is_highlighted ?? (plan.name === "pro");
            const featureList: string[] = f.list ?? [];
            const description = f.description ?? "";
            const ctaText = f.cta_text || "";
            const isDowngrade = currentPlanName !== "free" && plan.name === "free";

            return (
              <div
                key={plan.id}
                className={`relative p-6 rounded-2xl border transition-all ${
                  isHighlighted ? "border-primary bg-card shadow-glow" : "border-border bg-card"
                }`}
              >
                {isHighlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                    Recomendado
                  </span>
                )}
                <h3 className="font-display font-bold text-lg">{plan.display_name}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mb-3">{description}</p>
                )}
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-extrabold">
                    R$ {Number(plan.price_brl).toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                {featureList.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {featureList.map((item: string) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant={isCurrent ? "secondary" : isHighlighted ? "hero" : "outline"}
                  className="w-full"
                  disabled={isCurrent || !!loadingPlan}
                  onClick={() => {
                    if (isDowngrade) {
                      setCancelDialogOpen(true);
                    } else if (plan.name !== "free") {
                      handleCheckout(plan.name);
                    }
                  }}
                >
                  {loadingPlan === plan.name && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {isCurrent
                    ? "Plano Atual"
                    : isDowngrade
                    ? "Voltar ao Gratuito"
                    : ctaText || (plan.name === "free" ? "Gratuito" : "Selecionar")}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel/downgrade confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Cancelar Assinatura
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ao cancelar, você retornará ao plano gratuito e perderá acesso aos recursos premium ao final do período atual.
            Você será redirecionado ao portal de gestão para confirmar o cancelamento.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Manter Plano</Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={cancelLoading}>
              {cancelLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Cancelar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AssinaturasPage;
