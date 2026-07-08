"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const producer_1 = require("../queue/producer");
const router = (0, express_1.Router)();
/**
 * POST /ingest
 * Body: { repoUrl: string }
 *
 * Validates the payload, adds an ingestion job to BullMQ, and returns
 * the job ID immediately. The actual cloning/embedding runs asynchronously
 * in the worker process.
 */
router.post("/", async (req, res) => {
    const { repoUrl } = req.body;
    // ── Validation ──────────────────────────────────────────────────────────────
    if (!repoUrl || typeof repoUrl !== "string") {
        res.status(400).json({
            success: false,
            error: "Missing or invalid field: repoUrl (string required)",
        });
        return;
    }
    // Basic GitHub URL sanity check
    const isValidGitHubUrl = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/.test(repoUrl.trim());
    if (!isValidGitHubUrl) {
        res.status(400).json({
            success: false,
            error: "Invalid repoUrl. Expected format: https://github.com/<owner>/<repo>",
        });
        return;
    }
    // ── Enqueue ─────────────────────────────────────────────────────────────────
    try {
        const jobId = await (0, producer_1.addIngestionJob)({ repoUrl: repoUrl.trim() });
        res.status(202).json({
            success: true,
            message: "Ingestion job queued successfully.",
            jobId,
            repoUrl: repoUrl.trim(),
        });
    }
    catch (err) {
        console.error("[Route /ingest] Failed to enqueue job:", err);
        res.status(500).json({
            success: false,
            error: "Failed to queue ingestion job. Please try again.",
        });
    }
});
exports.default = router;
//# sourceMappingURL=ingest.js.map