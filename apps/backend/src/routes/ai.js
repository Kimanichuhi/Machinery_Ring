import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-flash-latest";

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

  req.user = data.user;
  next();
}

function buildFarmContext(context) {
  if (!context || typeof context !== "object") return "No farm context was provided.";

  return JSON.stringify(context, null, 2).slice(0, 12000);
}

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // ~8MB raw per file, before base64 inflation

function buildAttachmentParts(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .slice(0, MAX_ATTACHMENTS)
    .filter((attachment) => attachment?.data && attachment?.mimeType)
    .filter((attachment) => {
      // base64 length ~= 4/3 of raw byte length
      const approxBytes = (attachment.data.length * 3) / 4;
      return approxBytes <= MAX_ATTACHMENT_BYTES;
    })
    .map((attachment) => ({
      inline_data: {
        mime_type: attachment.mimeType,
        data: attachment.data,
      },
    }));
}

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

router.post("/assistant", verifyAuth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the backend." });
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const farmContext = buildFarmContext(req.body?.context);
  const attachmentParts = buildAttachmentParts(req.body?.attachments);

  const systemInstruction = [
    "You are MR Assistant, the farm intelligence assistant for Machring Nyandarua.",
    "Always stick to the manager's question. Answer only what was asked unless the manager asks for a report, summary, insights, plan, or recommendations.",
    "For simple factual questions such as counts, totals, names, or yes/no questions, give a short direct answer in one or two sentences.",
    "For analytical questions, answer the exact question first, then add only the most relevant evidence, insights, and practical next actions.",
    "When the manager asks to generate, list, show, or export records, return the records in a clean markdown table with useful columns. Keep any explanation short.",
    "For any fact about this farm's own records (counts, names, dates, prices, revenue, farmers, sales), use only the supplied platform data. Do not invent or guess platform records.",
    "You have live web search available for things the platform data does not cover, such as current weather, market prices, agronomy best practices, regulations, or news. Use it when the question needs current or general information, and say when you're citing information from the web versus the platform.",
    "If the manager attaches files (images, PDFs, spreadsheets, documents), analyze their actual content directly and answer using what's in them, combined with platform data and web search where relevant.",
    "When the data supports it, include totals, rankings, risks, likely causes, and practical next actions.",
    "If the question is only a greeting or casual opener, respond briefly and naturally, then invite the manager to ask what they need help with. Do not give a farm report for a greeting.",
    "If the manager asks how to improve sales, give a practical sales improvement plan using product performance, stock, farmer activity, visits, trainings, and revenue data where available.",
    "If data is missing, say what is missing and explain how that limits the answer.",
    "Structure substantial answers with short sections only when the question needs analysis: Direct answer, Key evidence, Insights, Recommended actions.",
    "Use Kenyan Shillings where money appears, and do not invent exact records that are not in the context.",
  ].join(" ");

  try {
    const geminiResponse = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Farm platform context:\n${farmContext}\n\nManager question:\n${prompt}`,
              },
              ...attachmentParts,
            ],
          },
        ],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.25,
          topP: 0.9,
          maxOutputTokens: 1400,
        },
      }),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const message = data?.error?.message || "Gemini request failed.";
      return res.status(geminiResponse.status).json({ error: message });
    }

    let content =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join("\n")
        .trim() || "";

    if (!content) {
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }

    const groundingChunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk) => chunk?.web)
      .filter((web) => web?.uri)
      .filter((web, index, all) => all.findIndex((other) => other.uri === web.uri) === index);

    if (sources.length > 0) {
      const sourceList = sources.map((web, index) => `${index + 1}. [${web.title || web.uri}](${web.uri})`).join("\n");
      content = `${content}\n\nSources:\n${sourceList}`;
    }

    res.json({ content, model });
  } catch (error) {
    res.status(502).json({ error: error?.message || "Could not reach Gemini." });
  }
});

export { router as aiRouter };
