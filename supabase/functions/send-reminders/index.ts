import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function createSmtpClient(host: string, port: number, user: string, pass: string) {
  const useTls = port === 465;
  return new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: useTls,
      auth: { username: user, password: pass },
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let client: SMTPClient | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const nowIso = now.toISOString();

    const { data: reminders, error } = await supabase
      .from("card_reminders")
      .select("id, card_id, user_id, remind_at")
      .eq("sent", false)
      .lte("remind_at", nowIso)
      .limit(50);

    if (error) throw error;

    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: dueSoonCards } = await supabase
      .from("board_cards")
      .select("id, title, due_date, board_id")
      .eq("is_complete", false)
      .gte("due_date", nowIso)
      .lte("due_date", in24h)
      .limit(100);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      if (reminders?.length) {
        await supabase.from("card_reminders").update({ sent: true }).in("id", reminders.map((r: any) => r.id));
      }
      return new Response(JSON.stringify({ sent: 0, reason: "SMTP not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    client = createSmtpClient(smtpHost, smtpPort, smtpUser, smtpPass);
    let sentCount = 0;

    if (reminders?.length) {
      for (const reminder of reminders) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("email, full_name")
          .eq("user_id", reminder.user_id)
          .single();

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
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <h2 style="color:#e67e22;">⏰ Lembrete de prazo</h2>
                  <p>Olá ${profile.full_name || ""},</p>
                  <p>Este é um lembrete do card <strong>${card.title}</strong>.</p>
                  ${card.due_date ? `<p>Prazo: <strong>${new Date(card.due_date).toLocaleDateString("pt-BR")}</strong></p>` : ""}
                  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
                  <p style="color:#999;font-size:12px;">MindPro - Seu workspace de produtividade</p>
                </div>
              `,
            });
            sentCount++;
          } catch (e) {
            console.error("Failed to send reminder:", e);
          }
        }
        await supabase.from("card_reminders").update({ sent: true }).eq("id", reminder.id);
      }
    }

    if (dueSoonCards?.length) {
      for (const card of dueSoonCards) {
        const { data: board } = await supabase.from("boards").select("user_id").eq("id", card.board_id).single();
        const { data: cardMembers } = await supabase.from("card_members").select("user_id").eq("card_id", card.id);

        const userIds = new Set<string>();
        if (board?.user_id) userIds.add(board.user_id);
        cardMembers?.forEach((m: any) => userIds.add(m.user_id));

        if (userIds.size === 0) continue;

        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, email, full_name, notify_due_soon")
          .in("user_id", Array.from(userIds));

        const notifiable = (profiles || []).filter((p: any) => p.email && p.notify_due_soon !== false);

        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const { data: alreadySent } = await supabase
          .from("card_reminders")
          .select("id")
          .eq("card_id", card.id)
          .gte("created_at", todayStart)
          .eq("sent", true)
          .limit(1);

        if (alreadySent?.length) continue;

        const dueStr = new Date(card.due_date!).toLocaleDateString("pt-BR", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        });

        for (const profile of notifiable) {
          try {
            await client.send({
              from: smtpUser,
              to: profile.email!,
              subject: `⏰ Prazo próximo: "${card.title}"`,
              html: `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <h2 style="color:#e67e22;">⏰ Prazo se aproximando</h2>
                  <p>Olá ${profile.full_name || ""},</p>
                  <p>O card <strong>${card.title}</strong> tem prazo para <strong>${dueStr}</strong>.</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
                  <p style="color:#999;font-size:12px;">MindPro - Seu workspace de produtividade</p>
                </div>
              `,
            });
            sentCount++;
          } catch (e) {
            console.error("Failed to send due-soon:", e);
          }
        }

        if (notifiable.length > 0) {
          await supabase.from("card_reminders").insert({
            card_id: card.id,
            user_id: notifiable[0].user_id,
            remind_at: card.due_date,
            sent: true,
          });
          for (const profile of notifiable) {
            await supabase.from("notifications").insert({
              user_id: profile.user_id,
              type: "due_soon",
              title: `Prazo próximo: "${card.title}" — ${dueStr}`,
              board_id: card.board_id,
              card_id: card.id,
            });
          }
        }
      }
    }

    try { await client.close(); } catch (_) { /* ignore close errors */ }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    try { if (client) await client.close(); } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
