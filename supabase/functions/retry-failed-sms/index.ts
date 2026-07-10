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

  const { data = [], error } = await supabase
    .from("sms_queue")
    .update({ status: "queued", error: null, scheduled_for: new Date().toISOString() })
    .eq("status", "failed")
    .lt("attempts", 3)
    .select("id");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }

  return new Response(JSON.stringify({ retried: data.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
