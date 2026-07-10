import "dotenv/config";
import express from "express";
import cors from "cors";
import { aiRouter } from "./routes/ai.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { communicationRouter } from "./routes/communication.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: true, credentials: true }));
// Raised from the 100kb default so MR Assistant's file-attachment analysis (base64-encoded uploads) fits.
app.use(express.json({ limit: "25mb" }));
app.use("/api/ai", aiRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/communication", communicationRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Backend dashboard API is running" });
});

app.listen(port, () => {
  console.log(`Backend dashboard API listening on http://localhost:${port}`);
});
