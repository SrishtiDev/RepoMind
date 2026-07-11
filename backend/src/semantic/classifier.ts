/**
 * classifier.ts - Sends a batch of code nodes to the LLM for tagging based on the taxonomy.
 * Batching is a tradeoff: fewer LLM calls means it is significantly cheaper and faster, 
 * but it might be slightly less precise per-node than making individual calls. 
 * This is an excellent MVP tradeoff.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TAXONOMY, VALID_TAGS } from "./taxonomy";
import { geminiRateLimiter } from "../lib/rateLimiter";

export interface NodeSummary {
  nodeId: string;
  filepath: string;
  name: string;
  codeSnippet: string;
  imports: string[];
}

export interface TaggedNode {
  nodeId: string;
  tags: string[];
}

// Instantiate the model - usually gemini-flash-latest is preferred for fast bulk processing
const model = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  temperature: 0.1, // Low temperature for consistent JSON
  maxOutputTokens: 4096, // Raised from 2048 — 20-node batches need more room
});

export async function classifyBatch(nodes: NodeSummary[]): Promise<TaggedNode[]> {
  if (nodes.length === 0) return [];

  const taxonomyText = Object.entries(TAXONOMY)
    .map(([tag, desc]) => `- ${tag}: ${desc}`)
    .join("\n");

  const nodesText = nodes
    .map(
      (n, i) => `Node [${i}] (ID: ${n.nodeId})
Filepath: ${n.filepath}
Name: ${n.name}
Imports: ${n.imports.join(", ")}
Code:
${n.codeSnippet}`
    )
    .join("\n---\n");

  const prompt = `You are an expert code analyst. Categorize the following code nodes into 1 or 2 tags from the provided taxonomy.
Do NOT invent new tags.
Return ONLY a valid JSON array of objects with "nodeId" and "tags" (string array). No markdown fences, no prose, no conversational text.

Format Example:
[
  { "nodeId": "some_id", "tags": ["api-route", "auth"] }
]

Taxonomy:
${taxonomyText}

Nodes to classify:
${nodesText}`;

  let rawContent: any;
  try {
    const response = await geminiRateLimiter.schedule(() => model.invoke(prompt));
    rawContent = response.content;
    
    let content = typeof rawContent === "string" ? rawContent : 
                  (rawContent && typeof rawContent === "object" && "text" in rawContent) ? String((rawContent as any).text) : 
                  String(rawContent);

    // Extract the JSON array from the first '[' to the last ']'
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      content = match[0];
    }

    // Defensively strip markdown fences if present
    content = content.trim();
    if (content.startsWith("```")) {
      const lines = content.split("\n");
      if (lines[0].startsWith("```")) lines.shift();
      if (lines[lines.length - 1].startsWith("```")) lines.pop();
      content = lines.join("\n").trim();
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error("Parsed result is not an array");
    }

    const validResults: TaggedNode[] = [];
    for (const item of parsed) {
      if (item && typeof item.nodeId === "string" && Array.isArray(item.tags)) {
        // Drop invalid tags and limit to max 2 tags
        const validTags = item.tags
          .filter((t: string) => VALID_TAGS.has(t))
          .slice(0, 2);
        
        validResults.push({
          nodeId: item.nodeId,
          tags: validTags,
        });
      }
    }

    return validResults;
  } catch (err: any) {
    console.error(`[Semantic Classifier] Failed to classify batch of ${nodes.length} nodes:`, err);
    if (rawContent !== undefined) {
      const raw = String(rawContent);
      console.error(`[Semantic Classifier] Raw response (truncated to 400 chars):`, raw.substring(0, 400));

      // ── Lenient truncation repair ──────────────────────────────────────────────────
      // If the error is a JSON parse failure (truncated array), try to recover
      // the last fully-closed object by scanning backward for the last '}'.
      // This saves partial results from batches where the LLM ran out of tokens.
      if (err instanceof SyntaxError) {
        try {
          const start = raw.indexOf("[");
          const lastClose = raw.lastIndexOf("}");
          if (start !== -1 && lastClose !== -1 && lastClose > start) {
            const repaired = raw.slice(start, lastClose + 1) + "]";
            const partialParsed = JSON.parse(repaired);
            if (Array.isArray(partialParsed) && partialParsed.length > 0) {
              const recovered: TaggedNode[] = [];
              for (const item of partialParsed) {
                if (item && typeof item.nodeId === "string" && Array.isArray(item.tags)) {
                  const validTags = item.tags.filter((t: string) => VALID_TAGS.has(t)).slice(0, 2);
                  recovered.push({ nodeId: item.nodeId, tags: validTags });
                }
              }
              console.warn(
                `[Semantic Classifier] Truncation-repair recovered ${recovered.length}/${nodes.length} nodes from partial response.`
              );
              return recovered;
            }
          }
        } catch {
          // Repair also failed — fall through to empty return
        }
      }
    }

    const isDailyQuotaError = err?.message?.toLowerCase().includes("perday") || err?.message?.includes("GenerateRequestsPerDayPerProjectPerModel-FreeTier");
    if (isDailyQuotaError) {
      throw err; // Re-throw to allow upstream budget tracking to catch it
    }

    // For transient errors, return empty results rather than crashing the whole job
    return [];
  }
}
