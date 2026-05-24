import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getValidAccessToken(supabase: any, userId: string, clientId: string, clientSecret: string) {
  const { data: row, error } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`DB read error: ${error.message}`);
  if (!row) throw new Error("NOT_CONNECTED");

  const expiresAt = new Date(row.token_expires_at).getTime();
  const now = Date.now();

  if (expiresAt - now > 60_000) return { access_token: row.access_token, row };

  // refresh
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
    grant_type: "refresh_token",
  });
  const r = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const tok = await r.json();
  if (!r.ok) throw new Error(`Refresh failed: ${JSON.stringify(tok)}`);

  const newExpiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const newAccess = tok.access_token as string;
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: newAccess, token_expires_at: newExpiresAt })
    .eq("user_id", userId);

  return { access_token: newAccess, row };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return json({ error: "Google OAuth não configurado (faltam GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET)." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    // Authenticated user client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // Service client to bypass RLS for token table writes (still scoped to user_id)
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ============================== DEBUG (no secrets leaked) ==============================
    if (action === "debug-client-id") {
      const cid = clientId ?? "";
      const SUFFIX = ".apps.googleusercontent.com";
      const core = cid.endsWith(SUFFIX) ? cid.slice(0, -SUFFIX.length) : cid;
      return json({
        length: cid.length,
        prefix_12: core.slice(0, 12),
        suffix_12_before_apps: core.slice(-12),
        ends_with_apps_googleusercontent_com: cid.endsWith(SUFFIX),
      });
    }



    // ============================== AUTH URL ==============================
    if (action === "auth-url") {
      const { redirect_uri } = body;
      if (!redirect_uri) return json({ error: "missing redirect_uri" }, 400);
      const scope = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri,
        response_type: "code",
        scope,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state: user.id,
      });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
    }

    // ============================== EXCHANGE ==============================
    if (action === "exchange") {
      const { code, redirect_uri } = body;
      if (!code || !redirect_uri) return json({ error: "missing code/redirect_uri" }, 400);

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri,
        grant_type: "authorization_code",
      });
      const r = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const tok = await r.json();
      if (!r.ok) return json({ error: "token exchange failed", details: tok }, 400);
      if (!tok.refresh_token) {
        return json({ error: "Refresh token ausente. Desconecte o app em https://myaccount.google.com/permissions e tente novamente." }, 400);
      }

      // Fetch email
      const meR = await fetch(GOOGLE_USERINFO, {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const me = await meR.json();

      const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
      const { error: upErr } = await adminClient
        .from("google_calendar_tokens")
        .upsert({
          user_id: user.id,
          google_email: me.email ?? null,
          access_token: tok.access_token,
          refresh_token: tok.refresh_token,
          token_expires_at: expiresAt,
          scope: tok.scope ?? null,
        }, { onConflict: "user_id" });
      if (upErr) return json({ error: "save failed", details: upErr.message }, 500);

      return json({ ok: true, email: me.email });
    }

    // ============================== STATUS ==============================
    if (action === "status") {
      const { data } = await adminClient
        .from("google_calendar_tokens")
        .select("google_email, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return json({ connected: !!data, email: data?.google_email ?? null });
    }

    // ============================== DISCONNECT ==============================
    if (action === "disconnect") {
      await adminClient.from("google_calendar_tokens").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    // ============================== LIST EVENTS ==============================
    if (action === "list-events") {
      const { timeMin, timeMax } = body;
      const { access_token } = await getValidAccessToken(adminClient, user.id, clientId, clientSecret);
      const url = new URL(`${GOOGLE_API}/calendars/primary/events`);
      if (timeMin) url.searchParams.set("timeMin", timeMin);
      if (timeMax) url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "250");
      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const data = await r.json();
      if (!r.ok) return json({ error: "google list failed", details: data }, r.status);
      return json({ items: data.items ?? [] });
    }

    // ============================== CREATE EVENT ==============================
    if (action === "create-event") {
      const { event } = body;
      if (!event) return json({ error: "missing event" }, 400);
      const { access_token } = await getValidAccessToken(adminClient, user.id, clientId, clientSecret);
      const r = await fetch(`${GOOGLE_API}/calendars/primary/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: "google create failed", details: data }, r.status);
      return json({ event: data });
    }

    // ============================== UPDATE EVENT ==============================
    if (action === "update-event") {
      const { eventId, event } = body;
      if (!eventId || !event) return json({ error: "missing eventId/event" }, 400);
      const { access_token } = await getValidAccessToken(adminClient, user.id, clientId, clientSecret);
      const r = await fetch(`${GOOGLE_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: "google update failed", details: data }, r.status);
      return json({ event: data });
    }

    // ============================== DELETE EVENT ==============================
    if (action === "delete-event") {
      const { eventId } = body;
      if (!eventId) return json({ error: "missing eventId" }, 400);
      const { access_token } = await getValidAccessToken(adminClient, user.id, clientId, clientSecret);
      const r = await fetch(`${GOOGLE_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!r.ok && r.status !== 410) {
        const data = await r.json().catch(() => ({}));
        return json({ error: "google delete failed", details: data }, r.status);
      }
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg === "NOT_CONNECTED" ? 409 : 500;
    return json({ error: msg }, status);
  }
});
