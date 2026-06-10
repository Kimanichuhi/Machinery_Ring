import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

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

  const systemInstruction = [
    "You are FIA, the Farm Intelligence Agent for Machring Nyandarua.",
    "Always stick to the manager's question. Answer only what was asked unless the manager asks for a report, summary, insights, plan, or recommendations.",
    "For simple factual questions such as counts, totals, names, or yes/no questions, give a short direct answer in one or two sentences.",
    "For analytical questions, answer the exact question first, then add only the most relevant evidence, insights, and practical next actions.",
    "When the manager asks to generate, list, show, or export records, return the records in a clean markdown table with useful columns. Keep any explanation short.",
    "Use only the supplied platform data for facts and figures. Do not invent records, names, dates, prices, or counts.",
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
            ],
          },
        ],
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

    const content =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join("\n")
        .trim() || "";

    if (!content) {
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }

    res.json({ content, model });
  } catch (error) {
    res.status(502).json({ error: error?.message || "Could not reach Gemini." });
  }
});

export { router as aiRouter };
