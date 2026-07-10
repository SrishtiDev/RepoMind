import express from "express";
import cors from "cors";
import "dotenv/config";

import ingestRouter from "./routes/ingest";
import queryRouter from "./routes/query";
import graphRouter from "./routes/graph";

// ─── Combined Worker for Free Tier ────────────────────────────────────────────
// By importing the worker here, the single Express process will ALSO listen to 
// the Redis queue and process background jobs. This saves you from needing a 
// paid second Background Worker service on Render.
import "./queue/worker";

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Health check — useful for Docker/k8s readiness probes */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** Ingestion pipeline trigger */
app.use("/ingest", ingestRouter);

/** Retrieval + agent Q&A */
app.use("/query", queryRouter);

/** Visual Code Map */
app.use("/graph", graphRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 RepoMind API running at http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/ingest  { repoUrl: "..." }`);
  console.log(`   POST http://localhost:${PORT}/query   { question: "..." }`);
  console.log(`   GET  http://localhost:${PORT}/health\n`);
});

export default app;
