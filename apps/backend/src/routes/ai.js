import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-5.6";

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

function isImageAttachment(attachment) {
  return typeof attachment?.mimeType === "string" && attachment.mimeType.startsWith("image/");
}

function validAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .slice(0, MAX_ATTACHMENTS)
    .filter((attachment) => attachment?.data && attachment?.mimeType)
    .filter((attachment) => {
      // base64 length ~= 4/3 of raw byte length
      const approxBytes = (attachment.data.length * 3) / 4;
      return approxBytes <= MAX_ATTACHMENT_BYTES;
    });
}

function buildSystemInstruction({ webSearchAvailable }) {
  return [
    "You are MR Assistant, the farm intelligence assistant for Machring Nyandarua.",
    "Always stick to the manager's question. Answer only what was asked unless the manager asks for a report, summary, insights, plan, or recommendations.",
    "For simple factual questions such as counts, totals, names, or yes/no questions, give a short direct answer in one or two sentences.",
    "For analytical questions, answer the exact question first, then add only the most relevant evidence, insights, and practical next actions.",
    "When the manager asks to generate, list, show, or export records, return the records in a clean markdown table with useful columns. Keep any explanation short.",
    "For any fact about this farm's own records (counts, names, dates, prices, revenue, farmers, sales), use only the supplied platform data. Do not invent or guess platform records.",
    webSearchAvailable
      ? "You have live web search available for things the platform data does not cover, such as current weather, market prices, agronomy best practices, regulations, or news. Use it when the question needs current or general information, and say when you're citing information from the web versus the platform."
      : "You do not have live web search in this session. For anything requiring current/real-time information (today's prices, weather, news), say clearly that you can't verify current data right now instead of guessing.",
    "If the manager attaches files (images, PDFs, spreadsheets, documents), analyze their actual content directly and answer using what's in them, combined with platform data and web search where relevant.",
    "When the data supports it, include totals, rankings, risks, likely causes, and practical next actions.",
    "If the question is only a greeting or casual opener, respond briefly and naturally, then invite the manager to ask what they need help with. Do not give a farm report for a greeting.",
    "If the manager asks how to improve sales, give a practical sales improvement plan using product performance, stock, farmer activity, visits, trainings, and revenue data where available.",
    "If data is missing, say what is missing and explain how that limits the answer.",
    "Structure substantial answers with short sections only when the question needs analysis: Direct answer, Key evidence, Insights, Recommended actions.",
    "When the manager asks to 'generate a report' (with or without a named topic such as sales, revenue, inventory, stock, workforce, machinery, visits, trainings, risks, or farmers), produce a formal report instead of a short answer, using markdown headings. Structure: a '## <Topic> Report' title naming the specific topic asked about (use '## Farm Performance Report' when no topic is named); '**Executive Summary**' with 2-3 sentences giving the headline result; '**Key Metrics**' as a markdown table or tight list of the numbers relevant to that topic only; '**Findings**' with the notable trends, leaders, laggards, or standouts drawn strictly from platform data; '**Risks**' only if a real risk applies to that topic, omit the section otherwise; '**Recommended Actions**' with 3-5 concrete, prioritized, farm-specific actions.",
    "Keep a report scoped to the topic asked: a sales report should not pad itself with unrelated workforce or training detail, and vice versa. Do not fabricate figures — if platform data for the requested topic is thin, say so in the Executive Summary and recommend what should be tracked to make future reports stronger.",
    "Use Kenyan Shillings where money appears, and do not invent exact records that are not in the context.",
  ].join(" ");
}

async function callOpenAI({ prompt, farmContext, attachments }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the backend.");

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const content = [
    { type: "text", text: `Farm platform context:\n${farmContext}\n\nManager question:\n${prompt}` },
  ];

  for (const attachment of attachments) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` },
    });
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemInstruction({ webSearchAvailable: false }) },
        { role: "user", content },
      ],
      max_completion_tokens: 1400,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response.");

  return { content: text, model };
}

async function callGemini({ prompt, farmContext, attachments }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the backend.");

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const attachmentParts = attachments.map((attachment) => ({
    inline_data: {
      mime_type: attachment.mimeType,
      data: attachment.data,
    },
  }));

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemInstruction({ webSearchAvailable: true }) }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: `Farm platform context:\n${farmContext}\n\nManager question:\n${prompt}` },
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed.");
  }

  let content =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  if (!content) throw new Error("Gemini returned an empty response.");

  const groundingChunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map((chunk) => chunk?.web)
    .filter((web) => web?.uri)
    .filter((web, index, all) => all.findIndex((other) => other.uri === web.uri) === index);

  if (sources.length > 0) {
    const sourceList = sources.map((web, index) => `${index + 1}. [${web.title || web.uri}](${web.uri})`).join("\n");
    content = `${content}\n\nSources:\n${sourceList}`;
  }

  return { content, model };
}

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    defaultProvider: "gemini",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    fallbackProvider: "openai",
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  });
});

router.post("/assistant", verifyAuth, async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const farmContext = buildFarmContext(req.body?.context);
  const attachments = validAttachments(req.body?.attachments);
  // OpenAI's chat completions endpoint only accepts images inline; anything else
  // (PDF, spreadsheet, doc) can only be handled by Gemini's fallback path.
  const openaiCanHandleAttachments = attachments.every(isImageAttachment);

  let geminiError = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await callGemini({ prompt, farmContext, attachments });
      return res.json(result);
    } catch (error) {
      geminiError = error;
      console.error("MR Assistant: Gemini request failed, falling back to OpenAI:", error.message);
    }
  }

  if (!process.env.OPENAI_API_KEY || !openaiCanHandleAttachments) {
    return res.status(500).json({ error: geminiError?.message || "No AI provider is configured on the backend." });
  }

  try {
    const result = await callOpenAI({ prompt, farmContext, attachments });
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: error?.message || "Could not reach the AI provider." });
  }
});

export { router as aiRouter };
