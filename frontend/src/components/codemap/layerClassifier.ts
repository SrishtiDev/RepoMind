/**
 * layerClassifier.ts
 * Frontend-only utility. Classifies a graph node into an architectural layer
 * based purely on filepath and filename heuristics — no API calls, no LLM.
 *
 * This is a SEPARATE dimension from the semantic "tags" in taxonomy.ts.
 * Do not conflate with the business-logic tagging system.
 */

export type NodeLayer = "frontend" | "backend" | "testing" | "deployment" | "other";

export interface GraphNode {
  id: string;
  data: {
    filepath?: string;
    label?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export function classifyNodeLayer(node: GraphNode): NodeLayer {
  const filepath = (node.data.filepath ?? "").replace(/\\/g, "/").toLowerCase();
  const filename = filepath.split("/").pop() ?? "";
  const ext = filename.includes(".") ? filename.split(".").slice(-1)[0] : "";
  const tags: string[] = node.data.tags ?? [];

  // ── Testing ──────────────────────────────────────────────────────────────────
  // Check first: a test file in backend/ is still "testing", not "backend"
  if (/\.(test|spec)\.[jt]sx?$/.test(filename) || tags.includes("test")) {
    return "testing";
  }

  // ── Deployment ───────────────────────────────────────────────────────────────
  if (
    filename === "dockerfile" ||
    filename === "docker-compose.yml" ||
    filename === "docker-compose.yaml" ||
    (/\.ya?ml$/.test(filename) && /(workflows|k8s|deploy|ci|cd)/.test(filepath))
  ) {
    return "deployment";
  }

  // ── Frontend ─────────────────────────────────────────────────────────────────
  if (
    filepath.startsWith("frontend/") ||
    ["tsx", "jsx", "css", "scss"].includes(ext)
  ) {
    return "frontend";
  }

  // ── Backend ──────────────────────────────────────────────────────────────────
  if (filepath.startsWith("backend/")) {
    return "backend";
  }

  return "other";
}
