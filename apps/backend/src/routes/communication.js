import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";
import { createSmsProvider } from "../communication/smsProviders.js";
import { WeatherService } from "../communication/weatherService.js";

const router = express.Router();

async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.toString().startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.toString().replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid authentication token" });
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (roleError) {
    return res.status(500).json({ error: "Could not verify user role." });
  }

  const role = roleRow?.role || "tot";
  if (!["admin", "manager"].includes(role)) {
    await supabaseAdmin.from("audit_logs").insert({
      action: "communication_permission_denied",
      user_id: data.user.id,
      details: { role, path: req.path, method: req.method },
    });

    return res.status(403).json({ error: "Communication module is restricted to Admin and Manager roles." });
  }

  req.user = data.user;
  req.role = role;
  next();
}

router.use(verifyAuth);

router.get("/health", (_req, res) => {
  const weather = new WeatherService().getStatus();
  res.json({
    ok: true,
    smsProvider: process.env.SMS_PROVIDER || "mock",
    weather,
  });
});

function isMissingCommunicationSchemaError(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "PGRST205" ||
    message.includes("communication_messages") && message.includes("schema cache") ||
    message.includes("Could not find the table")
  );
}

async function saveCommunicationMessage({ title, message, type, recipientCount, userId, provider }) {
  const { data, error } = await supabaseAdmin
    .from("communication_messages")
    .insert({
      title,
      body: message,
      type,
      status: "queued",
      recipient_count: recipientCount,
      provider,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingCommunicationSchemaError(error)) {
      console.warn(
        "SMS sent, but communication_messages is missing in Supabase. Apply supabase/migrations/20260629170000_communication_weather_intelligence.sql to enable SMS history."
      );
      return { data: null, warning: "SMS sent, but SMS history tables are not installed in Supabase yet." };
    }

    throw error;
  }

  return { data, warning: null };
}

router.post("/send-sms", async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];

    if (!title || !message || recipients.length === 0) {
      return res.status(400).json({ error: "title, message, and recipients are required." });
    }

    const provider = createSmsProvider();
    const providerResult = await provider.send({ title, message, recipients });

    const { data: savedMessage, warning } = await saveCommunicationMessage({
      title,
      message,
      type: req.body?.type || "manual",
      recipientCount: recipients.length,
      userId: req.user.id,
      provider: providerResult.provider,
    });

    res.json({
      messageId: savedMessage?.id,
      provider: providerResult.provider,
      status: providerResult.status,
      recipients: providerResult.recipients,
      warning,
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "Could not send SMS." });
  }
});

router.post("/schedule-sms", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const message = String(req.body?.message || "").trim();
  const scheduledFor = req.body?.scheduledFor;

  if (!title || !message || !scheduledFor) {
    return res.status(400).json({ error: "title, message, and scheduledFor are required." });
  }

  const { data, error } = await supabaseAdmin
    .from("scheduled_messages")
    .insert({
      title,
      body: message,
      scheduled_for: scheduledFor,
      repeat_rule: req.body?.repeatRule || "once",
      status: "pending",
      created_by: req.user.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ id: data?.id, status: "pending" });
});

router.post("/sync-weather", async (_req, res) => {
  const result = await new WeatherService().sync();
  res.json(result);
});

router.get("/weather-status", (_req, res) => {
  res.json(new WeatherService().getStatus());
});

router.post("/generate-weather-report", (_req, res) => {
  res.json({
    status: "queued",
    report: "Weather report generation will run when provider credentials and forecast cache are available.",
  });
});

export { router as communicationRouter };
