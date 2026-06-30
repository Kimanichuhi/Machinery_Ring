import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function requireOperator(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Missing authorization token");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid authorization token");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!["admin", "manager"].includes(roleRow?.role)) {
    throw new Error("Communication module is restricted to Admin and Manager roles.");
  }

  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const user = await requireOperator(req, supabase);
    const payload = await req.json();

    if (!payload?.title || !payload?.body || !Array.isArray(payload?.recipients) || payload.recipients.length === 0) {
      return new Response(JSON.stringify({ error: "title, body, and recipients are required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const provider = Deno.env.get("SMS_PROVIDER") || "mock";
    const { data: message, error } = await supabase
      .from("communication_messages")
      .insert({
        title: payload.title,
        body: payload.body,
        type: payload.type || "manual",
        status: provider === "mock" ? "queued" : "queued",
        recipient_count: payload.recipients.length,
        provider,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    const recipients = payload.recipients.map((recipient: Record<string, unknown>) => ({
      message_id: message.id,
      farmer_id: recipient.farmer_id || recipient.id || null,
      name: recipient.name || null,
      phone: recipient.phone,
      variables: recipient.variables || {},
      created_by: user.id,
    }));

    await supabase.from("communication_recipients").insert(recipients);
    await supabase.from("sms_queue").insert(
      recipients.map((recipient: Record<string, unknown>) => ({
        message_id: message.id,
        phone: recipient.phone,
        body: payload.body,
        status: "queued",
        created_by: user.id,
      })),
    );

    return new Response(JSON.stringify({ messageId: message.id, provider, status: "queued" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Could not queue SMS." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
