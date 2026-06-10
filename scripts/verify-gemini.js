import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
}

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: "Reply with exactly: Gemini connection OK" }],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 20,
      },
    }),
  }
);

const data = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(data?.error?.message || `Gemini request failed with HTTP ${response.status}.`);
}

const content =
  data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text)
    .filter(Boolean)
    .join(" ")
    .trim() || "";

if (!content) {
  throw new Error("Gemini returned an empty response.");
}

console.log(`Gemini connection verified with ${model}.`);
