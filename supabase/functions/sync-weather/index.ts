import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const configured = Boolean(
    Deno.env.get("WEATHER_API_URL") &&
    Deno.env.get("WEATHER_API_KEY") &&
    Deno.env.get("WEATHER_LOCATION") &&
    Deno.env.get("WEATHER_LATITUDE") &&
    Deno.env.get("WEATHER_LONGITUDE"),
  );

  if (!configured) {
    await supabase.from("weather_reports").insert({
      title: "Weather Sync Failed",
      report_type: "sync",
      summary: "Weather API Not Configured",
      status: "failed",
    });

    return new Response(JSON.stringify({ synced: false, error: "Weather API Not Configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  return new Response(JSON.stringify({ synced: false, status: "provider_adapter_pending" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
