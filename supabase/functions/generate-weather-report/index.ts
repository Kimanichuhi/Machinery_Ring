import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cache } = await supabase.from("weather_cache").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data, error } = await supabase
    .from("weather_reports")
    .insert({
      title: "Weather Report",
      report_type: "daily",
      summary: cache ? "Generated from latest weather cache." : "No weather cache is available.",
      recommendations: cache?.forecast?.recommendations || [],
      status: cache ? "completed" : "draft",
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }

  return new Response(JSON.stringify({ reportId: data.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
