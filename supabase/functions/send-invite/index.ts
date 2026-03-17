import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import nodemailer from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, inviterName, resourceTitle, resourceType, role, inviteLink } = await req.json();

    if (!to || !inviteLink) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: to, inviteLink" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtpHost = Deno.env.get("SMTP_HOST")!;
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    const roleLabel = role === "editor" ? "Editar" : "Visualizar";
    const resourceLabel = resourceType === "diagram" ? "diagrama" : "board";

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Mind Pro AI</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Convite para colaboração</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.6;">Olá! 👋</p>
      <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
        <strong>${inviterName || "Alguém"}</strong> convidou você para colaborar no ${resourceLabel}
        <strong>"${resourceTitle || "Sem título"}"</strong> com permissão de <strong>${roleLabel}</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#F97316,#EA580C);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Aceitar convite</a>
      </div>
      <p style="margin:0 0 8px;color:#71717a;font-size:12px;line-height:1.5;">Ou copie e cole este link no seu navegador:</p>
      <p style="margin:0 0 16px;color:#F97316;font-size:12px;word-break:break-all;">${inviteLink}</p>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;">Este convite expira em 7 dias.</p>
      <p style="margin:0;color:#a1a1aa;font-size:10px;">Mind Pro AI — mindproai.com.br</p>
    </div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `Mind Pro AI <${smtpUser}>`,
      to,
      subject: subject || `Convite para colaborar — ${resourceTitle || "Mind Pro AI"}`,
      html: htmlBody,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send invite error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro ao enviar email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
