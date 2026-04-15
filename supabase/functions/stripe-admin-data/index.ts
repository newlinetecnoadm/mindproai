import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is an admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: whitelistRow } = await supabase
      .from("admin_whitelist")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    const isAdmin = roleRow?.role === "admin" || !!whitelistRow;
    if (!isAdmin) throw new Error("Forbidden");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // ── Fetch active subscriptions from Stripe ──────────────────────────────
    const activeSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        expand: ["data.items.data.price"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      activeSubscriptions.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    // ── Fetch trialing subscriptions ─────────────────────────────────────────
    const trialingSubscriptions: Stripe.Subscription[] = [];
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: "trialing",
        limit: 100,
        expand: ["data.items.data.price"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      trialingSubscriptions.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    // ── Fetch last 12 months of invoices (paid) ──────────────────────────────
    const twelveMonthsAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 365;
    const paidInvoices: Stripe.Invoice[] = [];
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const page = await stripe.invoices.list({
        status: "paid",
        created: { gte: twelveMonthsAgo },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      paidInvoices.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    // ── Calculate real MRR from active subscriptions ─────────────────────────
    let mrrCents = 0;
    const revenueByPriceId = new Map<string, { amount: number; count: number; nickname: string }>();

    for (const sub of activeSubscriptions) {
      for (const item of sub.items.data) {
        const price = item.price;
        const unitAmount = price.unit_amount ?? 0;
        // Normalize to monthly (annual prices / 12)
        const monthlyAmount =
          price.recurring?.interval === "year"
            ? Math.round(unitAmount / 12)
            : unitAmount;
        mrrCents += monthlyAmount;

        const priceId = price.id;
        const existing = revenueByPriceId.get(priceId);
        revenueByPriceId.set(priceId, {
          amount: (existing?.amount ?? 0) + monthlyAmount,
          count: (existing?.count ?? 0) + 1,
          nickname: price.nickname ?? priceId,
        });
      }
    }

    // ── Build monthly invoice revenue for last 12 months ─────────────────────
    const monthlyRevenue: Record<string, number> = {};
    for (const inv of paidInvoices) {
      if (!inv.period_end) continue;
      const d = new Date(inv.period_end * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + (inv.amount_paid ?? 0);
    }

    // ── Count canceled subscriptions in last 12 months ───────────────────────
    const canceledInPeriod: Stripe.Subscription[] = [];
    hasMore = true;
    startingAfter = undefined;
    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: "canceled",
        created: { gte: twelveMonthsAgo },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      canceledInPeriod.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    const monthlyChurn: Record<string, number> = {};
    for (const sub of canceledInPeriod) {
      if (!sub.canceled_at) continue;
      const d = new Date(sub.canceled_at * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyChurn[key] = (monthlyChurn[key] ?? 0) + 1;
    }

    return new Response(
      JSON.stringify({
        // Real-time snapshot
        activeSubs: activeSubscriptions.length,
        trialingSubs: trialingSubscriptions.length,
        mrrCents,
        mrrBrl: mrrCents / 100,

        // Revenue breakdown by Stripe price
        revenueByPrice: Object.fromEntries(revenueByPriceId),

        // Historical monthly data (BRL cents)
        monthlyRevenue,
        monthlyChurn,

        // Raw counts for last paid invoices
        paidInvoicesLast12Months: paidInvoices.length,
        totalPaidLast12MonthsCents: paidInvoices.reduce((s, i) => s + (i.amount_paid ?? 0), 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
    );
  }
});
