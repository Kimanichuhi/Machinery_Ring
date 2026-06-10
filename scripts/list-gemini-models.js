import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`
);
const data = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(data?.error?.message || `Gemini model list failed with HTTP ${response.status}.`);
}

const generateModels = (data.models || [])
  .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
  .map((model) => model.name.replace(/^models\//, ""))
  .sort();

console.log(generateModels.join("\n"));
