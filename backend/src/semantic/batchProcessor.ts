import { DirectedGraph } from "graphology";
import { classifyBatch, NodeSummary, TaggedNode } from "./classifier";
import { consumeQuota, exhaustQuota } from "../lib/geminiQuota";

export const BATCH_SIZE = 20; // Reduced from 40 to avoid Gemini response truncation on large batches

/**
 * Extracts the snippet for a node given the start/end lines and the full file content.
 */
function extractSnippet(fileContent: string, startLine: number, endLine: number): string {
  const lines = fileContent.split("\n");
  const startIdx = Math.max(0, startLine - 1);
  const endIdx = Math.min(lines.length, endLine);
  return lines.slice(startIdx, endIdx).join("\n");
}

/**
 * Main entry point for tagging the structural graph.
 * 
 * @param graph - The structural graphology DirectedGraph
 * @param fileContents - Map of filepath -> raw file content
 * @returns The updated graph with "tags" attached to nodes
 */
export async function tagGraph(
  graph: DirectedGraph,
  fileContents: Map<string, string>
): Promise<DirectedGraph> {
  const nodesToProcess: NodeSummary[] = [];

  // 1. Gather and filter nodes
  graph.forEachNode((node, attrs) => {
    if (attrs.type === "function" || attrs.type === "class") {
      const filepath = attrs.filepath;
      const content = fileContents.get(filepath);
      
      if (!content || attrs.startLine === undefined || attrs.endLine === undefined) {
        return;
      }

      // Filter: skip trivial one-line/two-line nodes (not meaningful enough for semantic tagging)
      const lineCount = attrs.endLine - attrs.startLine + 1;
      if (lineCount < 3) {
        return;
      }
      
      try {
        const snippet = extractSnippet(content, attrs.startLine, attrs.endLine);
        
        // Find imports for this file to provide context
        const imports: string[] = [];
        graph.forEachOutboundEdge(filepath, (edge, edgeAttrs, source, target) => {
          if (edgeAttrs.type === "imports") {
             imports.push(target);
          }
        });

        nodesToProcess.push({
          nodeId: node,
          filepath,
          name: attrs.name,
          codeSnippet: snippet,
          imports
        });
      } catch (err) {
        console.warn(`[Semantic BatchProcessor] Failed to extract snippet for node ${node}`);
      }
    }
  });

  console.log(`[Semantic BatchProcessor] Found ${nodesToProcess.length} meaningful nodes to tag (skipped trivial ones).`);

  // 2. Batch nodes
  const batches: NodeSummary[][] = [];
  for (let i = 0; i < nodesToProcess.length; i += BATCH_SIZE) {
    batches.push(nodesToProcess.slice(i, i + BATCH_SIZE));
  }

  console.log(`[Semantic BatchProcessor] Processing ${batches.length} batches...`);
  let tagsApplied = 0;
  let quotaExhausted = false;

  // 3. Process batches sequentially (or with low concurrency) to track quota properly
  for (let i = 0; i < batches.length; i++) {
    if (quotaExhausted) {
      console.log(`[Semantic BatchProcessor] Skipping batch ${i + 1} — quota exhausted.`);
      continue;
    }

    const hasBudget = await consumeQuota();
    if (!hasBudget) {
      console.warn(`[Semantic BatchProcessor] Daily request budget reached (15/15) — skipping remaining classification until quota resets. Pipeline will proceed without tags.`);
      quotaExhausted = true;
      continue;
    }

    console.log(`[Semantic BatchProcessor] Classifying batch ${i + 1}/${batches.length}...`);
    try {
      const results = await classifyBatch(batches[i]);
      for (const res of results) {
        if (graph.hasNode(res.nodeId)) {
          graph.setNodeAttribute(res.nodeId, "tags", res.tags);
          tagsApplied++;
        }
      }
    } catch (err: any) {
      const isDailyQuotaError = err?.message?.toLowerCase().includes("perday") || err?.message?.includes("GenerateRequestsPerDayPerProjectPerModel-FreeTier");
      if (isDailyQuotaError) {
        console.warn(`[Semantic BatchProcessor] Live 429 daily quota error hit. Skipping remaining classification.`);
        await exhaustQuota(); // Mark it so subsequent runs today don't even try
        quotaExhausted = true;
      }
    }
  }

  console.log(`[Semantic BatchProcessor] Applied tags to ${tagsApplied} nodes.`);
  return graph;
}

