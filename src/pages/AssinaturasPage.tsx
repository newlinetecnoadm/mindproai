import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

const PLAN_PRICE_MAP: Record<string, string> = {
  pro: "price_1TAXMiEXDv2crum3SeNjqH89",
  business: "price_1TAXNPEXDv2crum3gSZmhaq0",
};

const AssinaturasPage = () => {
  const { data: currentPlan, isLoading: planLoading } = usePlan();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
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
              <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Gerenciar Assinatura
              </Button>
            )}
            {currentPlanName === "free" && <Button variant="hero">Fazer Upgrade</Button>}
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {(plans ?? []).map((plan: any) => {
            const isCurrent = currentPlanName === plan.name;
            const isHighlighted = plan.name === "pro";
            const features = (plan.features as any)?.list ?? [];

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
                <p className="text-sm text-muted-foreground mb-3">{plan.name === "free" ? "Para uso pessoal básico" : plan.name === "pro" ? "Para profissionais" : "Para equipes"}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-extrabold">
                    R$ {Number(plan.price_brl).toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                {features.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {features.map((f: string) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant={isCurrent ? "secondary" : isHighlighted ? "hero" : "outline"}
                  className="w-full"
                  disabled={isCurrent || plan.name === "free" || !!loadingPlan}
                  onClick={() => handleCheckout(plan.name)}
                >
                  {loadingPlan === plan.name && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {isCurrent ? "Plano Atual" : plan.name === "free" ? "Gratuito" : "Selecionar"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssinaturasPage;
