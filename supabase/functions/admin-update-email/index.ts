import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado: header ausente" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Não autorizado: token inválido" });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return json({ error: "Não autorizado: role insuficiente (" + (roleData?.role || "nenhum") + ")" });
    }

    const { user_id, new_email } = await req.json();

    if (!user_id || !new_email || typeof new_email !== "string") {
      return json({ error: "user_id e new_email são obrigatórios" });
    }

    const email = new_email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Formato de e-mail inválido" });
    }

    // Empresa isolation: skip for super_admin, enforce for admin
    if (roleData.role !== "super_admin") {
      const { data: callerProfile } = await adminClient
        .from("profiles").select("empresa_id").eq("user_id", caller.id).maybeSingle();
      const { data: targetProfile } = await adminClient
        .from("profiles").select("empresa_id").eq("user_id", user_id).maybeSingle();

      if (!callerProfile?.empresa_id || !targetProfile?.empresa_id ||
          callerProfile.empresa_id !== targetProfile.empresa_id) {
        return json({ error: "Usuário não pertence à sua empresa" });
      }
    }

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      email,
      email_confirm: true,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      const isDuplicate = msg.includes("already") || msg.includes("duplicate") || msg.includes("exists");
      return json({
        error: isDuplicate
          ? "Este e-mail já está em uso por outro usuário."
          : error.message,
      });
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado" }, 500);
  }
});
