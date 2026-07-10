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

  const payload = await req.json().catch(() => ({}));
  const severity = payload.severity || "medium";
  const alertType = payload.alert_type || "weather";

  const { data, error } = await supabase
    .from("weather_alerts")
    .insert({
      alert_type: alertType,
      severity,
      title: payload.title || "Weather Alert",
      message: payload.message || "Weather alert generated. Review conditions before field activity.",
      recommendation: payload.recommendation || "Notify affected farmers and review machinery scheduling.",
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }

  return new Response(JSON.stringify({ alertId: data.id, severity }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
