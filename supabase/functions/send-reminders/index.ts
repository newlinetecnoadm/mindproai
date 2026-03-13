import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find unsent reminders that are due
    const now = new Date().toISOString();
    const { data: reminders, error } = await supabase
      .from("card_reminders")
      .select("id, card_id, user_id, remind_at")
      .eq("sent", false)
      .lte("remind_at", now)
      .limit(50);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Mark as sent anyway to avoid re-processing
      const ids = reminders.map((r: any) => r.id);
      await supabase.from("card_reminders").update({ sent: true }).in("id", ids);
      return new Response(JSON.stringify({ sent: 0, reason: "SMTP not configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const client = new SMTPClient({
      connection: { hostname: smtpHost, port: smtpPort, tls: true, auth: { username: smtpUser, password: smtpPass } },
    });

    let sentCount = 0;

    for (const reminder of reminders) {
      // Get user email
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email, full_name")
        .eq("user_id", reminder.user_id)
        .single();

      // Get card info
      const { data: card } = await supabase
        .from("board_cards")
        .select("title, due_date, board_id")
        .eq("id", reminder.card_id)
        .single();

      if (profile?.email && card) {
        try {
          await client.send({
            from: smtpUser,
            to: profile.email,
            subject: `⏰ Lembrete: ${card.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e67e22;">⏰ Lembrete de prazo</h2>
                <p>Olá ${profile.full_name || ""},</p>
                <p>Este é um lembrete do card <strong>${card.title}</strong>.</p>
                ${card.due_date ? `<p>Prazo: <strong>${new Date(card.due_date).toLocaleDateString("pt-BR")}</strong></p>` : ""}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">MindPro - Seu workspace de produtividade</p>
              </div>
            `,
          });
          sentCount++;
        } catch (e) {
          console.error("Failed to send reminder email:", e);
        }
      }

      // Mark as sent
      await supabase.from("card_reminders").update({ sent: true }).eq("id", reminder.id);
    }

    await client.close();

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
