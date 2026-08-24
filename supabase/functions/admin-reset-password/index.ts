import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their token
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem redefinir senhas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "user_id e new_password são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empresa isolation: skip for super_admin, enforce for admin
    if (roleData.role !== "super_admin") {
      const { data: callerProfile } = await adminClient
        .from("profiles").select("empresa_id").eq("user_id", caller.id).maybeSingle();
      const { data: targetProfile } = await adminClient
        .from("profiles").select("empresa_id").eq("user_id", user_id).maybeSingle();

      if (!callerProfile?.empresa_id || !targetProfile?.empresa_id ||
          callerProfile.empresa_id !== targetProfile.empresa_id) {
        return new Response(JSON.stringify({ error: "Usuário não pertence à sua empresa" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update password using admin client
    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      const isWeakPassword = msg.includes("weak") || msg.includes("easy to guess");
      const message = isWeakPassword
        ? "Senha muito fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e símbolos."
        : error.message;
      const status = isWeakPassword ? 400 : 500;

      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
