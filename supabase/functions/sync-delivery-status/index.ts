import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const provider = Deno.env.get("SMS_PROVIDER") || "mock";
  const { count } = await supabase.from("sms_delivery_logs").select("id", { count: "exact", head: true }).eq("delivery_status", "pending");

  return new Response(JSON.stringify({
    provider,
    pending: count || 0,
    synchronized: false,
    status: provider === "mock" ? "mock_provider_no_remote_status" : "provider_adapter_pending",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
