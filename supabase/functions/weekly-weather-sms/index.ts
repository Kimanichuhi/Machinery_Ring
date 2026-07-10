import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeSystemOrRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  const authError = await authorizeSystemOrRole(req, supabase, serviceRoleKey, ["admin", "manager"], corsHeaders);
  if (authError) return authError;

  // Guard against duplicate sends if triggered more than once in the same week
  // (e.g. a cron misfire or a manual re-trigger shortly after a scheduled run).
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSend } = await supabase
    .from("communication_messages")
    .select("id")
    .eq("type", "weekly_weather")
    .gte("created_at", sixDaysAgo)
    .limit(1)
    .maybeSingle();

  if (recentSend) {
    return new Response(JSON.stringify({ error: "Weekly weather update already sent in the last 6 days", messageId: recentSend.id }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: farmers = [] } = await supabase.from("farmers").select("id,name,phone").eq("status", "active");
  const body = "Weekly Weather Update\nThis week in Nyandarua:\nRainfall: Pending\nTemperature: Pending\nRecommendations:\n- Planting\n- Spraying\n- Dairy\n- Machinery\nRegards,\nMachinery Ring Nyandarua";

  const { data: message, error } = await supabase
    .from("communication_messages")
    .insert({
      title: "Weekly Weather Update",
      body,
      type: "weekly_weather",
      status: "queued",
      recipient_count: farmers.length,
      provider: Deno.env.get("SMS_PROVIDER") || "mock",
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }

  await supabase.from("sms_queue").insert(farmers.map((farmer: Record<string, unknown>) => ({
    message_id: message.id,
    phone: farmer.phone,
    body,
    status: "queued",
  })));

  return new Response(JSON.stringify({ messageId: message.id, queued: farmers.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
