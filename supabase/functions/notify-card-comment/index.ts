import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">MindPro AI</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin:0 0 16px;color:#18181b;font-size:15px;">💬 Novo comentário</p>
      <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
        <strong>${commenterName}</strong> comentou no card <strong>"${cardTitle}"</strong>:
      </p>
      <div style="background:#f4f4f5;border-left:3px solid #8b5cf6;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
        <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.5;white-space:pre-wrap;">${comment}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${boardUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Ver card</a>
      </div>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0;color:#a1a1aa;font-size:11px;">MindPro AI — mindproai.com.br</p>
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

    // Validate caller
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { card_id, comment, board_url } = await req.json();
    if (!card_id || !comment) {
      return new Response(JSON.stringify({ error: "card_id e comment são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get card + board info
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

    // Get board owner
    const { data: board } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", card.board_id)
      .single();

    // Get board members
    const { data: members } = await supabase
      .from("board_members")
      .select("user_id")
      .eq("board_id", card.board_id);

    // Get card members
    const { data: cardMembers } = await supabase
      .from("card_members")
      .select("user_id")
      .eq("card_id", card_id);

    // Collect unique user IDs to notify (exclude commenter)
    const notifySet = new Set<string>();
    if (board?.user_id && board.user_id !== user.id) notifySet.add(board.user_id);
    members?.forEach((m: any) => { if (m.user_id !== user.id) notifySet.add(m.user_id); });
    cardMembers?.forEach((m: any) => { if (m.user_id !== user.id) notifySet.add(m.user_id); });

    if (notifySet.size === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get emails for these users (only those with notify_comments enabled)
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, email, full_name, notify_comments")
      .in("user_id", Array.from(notifySet));

    // Filter to only users who have notifications enabled
    const notifiableProfiles = (profiles || []).filter(
      (p: any) => p.email && p.notify_comments !== false
    );

    if (!notifiableProfiles.length) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get commenter name
    const { data: commenterProfile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const commenterName = commenterProfile?.full_name || commenterProfile?.email || "Alguém";

    // Send emails
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error("SMTP not configured");
      return new Response(JSON.stringify({ error: "SMTP não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: parseInt(smtpPort || "465"),
        tls: true,
        auth: { username: smtpUser, password: smtpPass },
      },
    });

    const escapedComment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = buildHtml(commenterName, card.title, escapedComment, board_url || "");

    let sent = 0;
    for (const profile of profiles) {
      if (!profile.email) continue;
      try {
        await client.send({
          from: smtpUser,
          to: profile.email,
          subject: `💬 Novo comentário em "${card.title}" — MindPro AI`,
          html,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${profile.email}:`, e);
      }
    }

    await client.close();

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
