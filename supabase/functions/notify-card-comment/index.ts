import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import nodemailer from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildHtml(commenterName: string, cardTitle: string, comment: string, boardUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Mind Pro AI</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin:0 0 16px;color:#18181b;font-size:15px;">💬 Novo comentário</p>
      <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
        <strong>${commenterName}</strong> comentou no card <strong>"${cardTitle}"</strong>:
      </p>
      <div style="background:#f4f4f5;border-left:3px solid #F97316;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
        <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.5;white-space:pre-wrap;">${comment}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${boardUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#F97316,#EA580C);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Ver card</a>
      </div>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;">Mind Pro AI — mindproai.com.br</p>
      <p style="margin:0;color:#a1a1aa;font-size:10px;">Desenvolvido por <a href="https://newlinetec.com.br" style="color:#a1a1aa;">Newline Tecnologia</a></p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { card_id, comment, board_url, mentioned_user_ids } = await req.json();
    if (!card_id || !comment) {
      return new Response(JSON.stringify({ error: "card_id e comment são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: card } = await supabase
      .from("board_cards")
      .select("title, board_id")
      .eq("id", card_id)
      .single();

    if (!card) {
      return new Response(JSON.stringify({ error: "Card não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notifySet: Set<string>;

    if (mentioned_user_ids && Array.isArray(mentioned_user_ids) && mentioned_user_ids.length > 0) {
      notifySet = new Set(mentioned_user_ids.filter((id: string) => id !== user.id));
    } else {
      notifySet = new Set<string>();
      const { data: board } = await supabase
        .from("boards")
        .select("user_id")
        .eq("id", card.board_id)
        .single();
      const { data: members } = await supabase
        .from("board_members")
        .select("user_id")
        .eq("board_id", card.board_id);
      const { data: cardMembers } = await supabase
        .from("card_members")
        .select("user_id")
        .eq("card_id", card_id);

      if (board?.user_id && board.user_id !== user.id) notifySet.add(board.user_id);
      members?.forEach((m: any) => { if (m.user_id !== user.id) notifySet.add(m.user_id); });
      cardMembers?.forEach((m: any) => { if (m.user_id !== user.id) notifySet.add(m.user_id); });
    }

    if (notifySet.size === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, email, full_name, notify_comments")
      .in("user_id", Array.from(notifySet));

    const notifiableProfiles = (profiles || []).filter(
      (p: any) => p.email && p.notify_comments !== false
    );

    if (!notifiableProfiles.length) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: commenterProfile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const commenterName = commenterProfile?.full_name || commenterProfile?.email || "Alguém";

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error("SMTP not configured");
      return new Response(JSON.stringify({ error: "SMTP não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const escapedComment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = buildHtml(commenterName, card.title, escapedComment, board_url || "");

    let sent = 0;
    for (const profile of notifiableProfiles) {
      if (!profile.email) continue;
      try {
        await transporter.sendMail({
          from: `Mind Pro AI <${smtpUser}>`,
          to: profile.email,
          subject: `💬 Novo comentário em "${card.title}" — MindPro AI`,
          html,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${profile.email}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, notified: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-card-comment error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
