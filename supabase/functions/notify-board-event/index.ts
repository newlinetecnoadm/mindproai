import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotificationType = "card_moved" | "member_added" | "due_soon";

const PREF_MAP: Record<NotificationType, string> = {
  card_moved: "notify_card_moved",
  member_added: "notify_member_added",
  due_soon: "notify_due_soon",
};

function buildEmailHtml(type: NotificationType, data: Record<string, any>): { subject: string; html: string } {
  const templates: Record<NotificationType, { subject: string; body: string }> = {
    card_moved: {
      subject: `🔀 Card "${data.card_title}" foi movido — MindPro AI`,
      body: `<p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;"><strong>${data.actor_name}</strong> moveu o card <strong>"${data.card_title}"</strong> de <strong>${data.from_column}</strong> para <strong>${data.to_column}</strong>.</p>`,
    },
    member_added: {
      subject: `👤 Você foi adicionado ao card "${data.card_title}" — MindPro AI`,
      body: `<p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;"><strong>${data.actor_name}</strong> adicionou você como membro do card <strong>"${data.card_title}"</strong>.</p>`,
    },
    due_soon: {
      subject: `⏰ Prazo próximo: "${data.card_title}" — MindPro AI`,
      body: `<p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">O card <strong>"${data.card_title}"</strong> tem prazo para <strong>${data.due_date}</strong>.</p>`,
    },
  };

  const t = templates[type];
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Mind Pro AI</h1>
    </div>
    <div style="padding:32px 24px;">
      ${t.body}
      ${data.board_url ? `<div style="text-align:center;margin:28px 0;"><a href="${data.board_url}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#F97316,#EA580C);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Ver board</a></div>` : ""}
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;">Mind Pro AI — mindproai.com.br</p>
      <p style="margin:0;color:#a1a1aa;font-size:10px;">Desenvolvido por <a href="https://newlinetec.com.br" style="color:#a1a1aa;">Newline Tecnologia</a></p>
    </div>
  </div>
</body>
</html>`;

  return { subject: t.subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let smtpClient: SMTPClient | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, user_ids, data } = await req.json() as {
      type: NotificationType; user_ids: string[]; data: Record<string, any>;
    };

    if (!type || !user_ids?.length) {
      return new Response(JSON.stringify({ error: "type e user_ids obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prefColumn = PREF_MAP[type];
    if (!prefColumn) {
      return new Response(JSON.stringify({ error: "Tipo de notificação inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetIds = user_ids.filter((id) => id !== user.id);
    if (!targetIds.length) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select(`user_id, email, full_name, ${prefColumn}`)
      .in("user_id", targetIds);

    const notifiable = (profiles || []).filter((p: any) => p.email && p[prefColumn] !== false);

    if (!notifiable.length) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: actorProfile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const actorName = actorProfile?.full_name || actorProfile?.email || "Alguém";
    const emailData = { ...data, actor_name: actorName };
    const { subject, html } = buildEmailHtml(type, emailData);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(JSON.stringify({ error: "SMTP não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const useTls = smtpPort === 465;
    smtpClient = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: useTls,
        auth: { username: smtpUser, password: smtpPass },
      },
    });

    let sent = 0;
    for (const profile of notifiable) {
      try {
        await smtpClient.send({ from: smtpUser, to: profile.email!, subject, html });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${profile.email}:`, e);
      }
    }

    try { await smtpClient.close(); } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ success: true, notified: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-board-event error:", error);
    try { if (smtpClient) await smtpClient.close(); } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
