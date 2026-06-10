import express from "express";
import cors from "cors";
import { aiRouter } from "./routes/ai.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api/ai", aiRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Backend dashboard API is running" });
});

app.listen(port, () => {
  console.log(`Backend dashboard API listening on http://localhost:${port}`);
});
