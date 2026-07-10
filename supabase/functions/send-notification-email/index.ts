import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeSystemOnly } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Only the on-insert DB trigger (public.trigger_notification_email) is
    // meant to call this, authenticated with the service-role key.
    const authError = authorizeSystemOnly(req, supabaseServiceKey, corsHeaders);
    if (authError) return authError;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // This function is called via DB webhook (trigger) or manually by an authorized caller
    const payload = await req.json();

    // DB webhook sends { type, table, record, ... }
    const record = payload.record || payload;

    const userId = record.user_id;
    const title = record.title;
    const message = record.message;
    const notificationType = record.type || "info";

    if (!userId || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user has email notifications enabled
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("email_notifications")
      .eq("user_id", userId)
      .maybeSingle();

    // Default to true if no settings exist
    const emailEnabled = settings?.email_notifications ?? true;

    if (!emailEnabled) {
      console.log(`Email notifications disabled for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "email_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Could not find user email:", profileError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Send email via Resend
    const emailResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MRO Dashboard <onboarding@resend.dev>",
        to: [profile.email],
        subject: `${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">MRO Dashboard</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">${notificationType}</p>
              <h2 style="color: #111827; margin: 0 0 12px;">${title}</h2>
              <p style="color: #374151; line-height: 1.6;">${message}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Hi ${profile.name}, you received this because email notifications are enabled in your settings.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(`Resend API error [${emailResponse.status}]: ${JSON.stringify(emailResult)}`);
    }

    console.log(`Email sent to ${profile.email} for notification: ${title}`);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
