import express from "express";
import cors from "cors";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api/dashboard", dashboardRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Backend dashboard API is running" });
});

app.listen(port, () => {
  console.log(`Backend dashboard API listening on http://localhost:${port}`);
});
