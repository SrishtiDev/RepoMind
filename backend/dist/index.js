"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const ingest_1 = __importDefault(require("./routes/ingest"));
const query_1 = __importDefault(require("./routes/query"));
const graph_1 = __importDefault(require("./routes/graph"));
// ─── App Setup ────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3000);
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ─── Routes ───────────────────────────────────────────────────────────────────
/** Health check — useful for Docker/k8s readiness probes */
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
/** Ingestion pipeline trigger */
app.use("/ingest", ingest_1.default);
/** Retrieval + agent Q&A */
app.use("/query", query_1.default);
/** Visual Code Map */
app.use("/graph", graph_1.default);
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
exports.default = app;
//# sourceMappingURL=index.js.map