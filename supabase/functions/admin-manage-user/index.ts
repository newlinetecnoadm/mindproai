import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: whitelistRow } = await supabase
      .from("admin_whitelist")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (!roleRow && !whitelistRow) throw new Error("Forbidden");

    const { action, targetUserId } = await req.json();

    if (!targetUserId) throw new Error("targetUserId is required");

    switch (action) {
      case "send_password_reset": {
        // Get target user email
        const { data: targetUser, error: getUserErr } = await supabase.auth.admin.getUserById(targetUserId);
        if (getUserErr || !targetUser?.user) throw new Error("User not found");
        const email = targetUser.user.email;
        if (!email) throw new Error("User has no email");

        // Generate password reset link
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        if (linkErr) throw linkErr;

        return new Response(
          JSON.stringify({ success: true, message: `Link de redefinição gerado para ${email}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      case "set_temporary_password": {
        // Generate a random temporary password
        const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
        const { error: updateErr } = await supabase.auth.admin.updateUserById(targetUserId, {
          password: tempPassword,
        });
        if (updateErr) throw updateErr;

        return new Response(
          JSON.stringify({ success: true, temporaryPassword: tempPassword }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      case "delete_user": {
        // Delete user from auth (cascades to profiles via FK)
        const { error: deleteErr } = await supabase.auth.admin.deleteUser(targetUserId);
        if (deleteErr) throw deleteErr;

        // Also clean up profile and subscriptions
        await supabase.from("user_profiles").delete().eq("user_id", targetUserId);
        await supabase.from("subscriptions").delete().eq("user_id", targetUserId);
        await supabase.from("user_roles").delete().eq("user_id", targetUserId);

        return new Response(
          JSON.stringify({ success: true, message: "Usuário excluído com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400;
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
    );
  }
});
