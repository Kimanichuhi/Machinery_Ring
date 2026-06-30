import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
