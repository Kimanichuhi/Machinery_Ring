import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Unauthorized");

    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (!["admin", "manager"].includes(roleRow?.role)) throw new Error("Forbidden");

    const payload = await req.json();
    if (!payload.title || !payload.body || !payload.scheduled_for) {
      return new Response(JSON.stringify({ error: "title, body, and scheduled_for are required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from("scheduled_messages")
      .insert({
        title: payload.title,
        body: payload.body,
        type: payload.type || "manual",
        scheduled_for: payload.scheduled_for,
        repeat_rule: payload.repeat_rule || "once",
        cron_expression: payload.cron_expression || null,
        filters: payload.filters || {},
        status: "pending",
        created_by: userData.user.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.id, status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Could not schedule SMS." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
