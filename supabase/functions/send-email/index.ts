import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Email templates ──────────────────────────────────────────────

function wrapLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">MindPro AI</h1>
    </div>
    <div style="padding:32px 24px;">
      ${content}
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0;color:#a1a1aa;font-size:11px;">MindPro AI — mindproai.com.br</p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;">
  <a href="${href}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>
</div>`;
}

interface TemplateData {
  // invite
  inviterName?: string;
  resourceTitle?: string;
  resourceType?: string;
  role?: string;
  inviteLink?: string;
  // notification
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  // generic
  html?: string;
}

function renderInvite(d: TemplateData): { subject: string; html: string } {
  const roleLabel = d.role === "editor" ? "Editar" : "Visualizar";
  const resourceLabel = d.resourceType === "board" ? "board" : "diagrama";
  const link = d.inviteLink || "";

  const body = `
    <p style="margin:0 0 16px;color:#18181b;font-size:15px;">Olá! 👋</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      <strong>${d.inviterName || "Alguém"}</strong> convidou você para colaborar no ${resourceLabel}
      <strong>"${d.resourceTitle || "Sem título"}"</strong> com permissão de <strong>${roleLabel}</strong>.
    </p>
    ${ctaButton(link, "Aceitar convite")}
    <p style="margin:0;color:#71717a;font-size:12px;">Ou copie e cole: <span style="color:#6366f1;word-break:break-all;">${link}</span></p>
    <p style="margin:12px 0 0;color:#a1a1aa;font-size:11px;">Este convite expira em 7 dias.</p>`;

  return {
    subject: `Convite para colaborar — ${d.resourceTitle || "MindPro AI"}`,
    html: wrapLayout(body),
  };
}

function renderNotification(d: TemplateData): { subject: string; html: string } {
  let body = `<p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:600;">${d.title || "Notificação"}</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">${d.message || ""}</p>`;

  if (d.actionUrl) {
    body += ctaButton(d.actionUrl, d.actionLabel || "Ver detalhes");
  }

  return {
    subject: d.title || "Notificação — MindPro AI",
    html: wrapLayout(body),
  };
}

function renderCustom(d: TemplateData): { subject: string; html: string } {
  return {
    subject: d.title || "MindPro AI",
    html: d.html || wrapLayout(`<p>${d.message || ""}</p>`),
  };
}

const templates: Record<string, (d: TemplateData) => { subject: string; html: string }> = {
  invite: renderInvite,
  notification: renderNotification,
  custom: renderCustom,
};

// ── Handler ──────────────────────────────────────────────────────

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

    const body = await req.json();
    const { to, subject: customSubject, template = "invite", ...templateData } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Campo obrigatório: to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderer = templates[template] || templates.invite;
    const rendered = renderer(templateData as TemplateData);
    const finalSubject = customSubject || rendered.subject;

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    await client.send({
      from: Deno.env.get("SMTP_USER")!,
      to,
      subject: finalSubject,
      html: rendered.html,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
