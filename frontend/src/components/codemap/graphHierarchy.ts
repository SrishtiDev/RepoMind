/**
 * graphHierarchy.ts
 *
 * Computes a two-level hierarchy from the flat graph returned by /graph:
 *
 *   Level 0 (Overview)  — one synthetic "module" node per top-level directory
 *                          (e.g. "backend/routes", "frontend/components").
 *                          Edges connect modules that have at least one cross-
 *                          module call/import between their children.
 *
 *   Level 1 (Drill-down) — the actual raw nodes that live inside a module,
 *                           with intra-module edges only.
 *
 * The full flat graph is fetched once from the API (unchanged). Everything here
 * is a pure in-memory transformation — no extra network requests.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawNode {
  id: string;
  type: string; // "file" | "function" | "class" | "external"
  data: {
    label: string;
    filepath?: string;
    tags?: string[];
    startLine?: number;
    endLine?: number;
    [key: string]: any;
  };
  position: { x: number; y: number };
}

export interface RawEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

/** A synthetic module node produced by computeOverviewNodes */
export interface ModuleNode {
  id: string;            // e.g. "module::backend/routes"
  type: "module";
  label: string;         // human-readable: "backend/routes"
  fileCount: number;
  nodeCount: number;
  tags: string[];        // union of all child node tags
  /** The raw node IDs that belong to this module */
  childIds: string[];
}

export interface ModuleEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number; // number of cross-module connections this edge represents
}

export interface HierarchyResult {
  moduleNodes: ModuleNode[];
  moduleEdges: ModuleEdge[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derives the "module key" for a raw node.
 *
 * Strategy (in priority order):
 *   1. filepath → take the first 2 segments (e.g. "backend/routes")
 *      but collapse single-file top-level dirs into the first segment.
 *   2. No filepath (external packages) → "external"
 *   3. Fallback → "other"
 *
 * We deliberately cap at 2 path segments so the overview stays high-level
 * (e.g. "backend/routes", not "backend/src/routes/graph.ts").
 */
export function getModuleKey(node: RawNode): string {
  if (node.type === "external") return "external";

  const fp: string = node.data.filepath ?? node.id ?? "";
  if (!fp) return "other";

  // Normalise separators, strip leading ./
  const normalized = fp.replace(/\\/g, "/").replace(/^\.\//, "");

  const parts = normalized.split("/");

  if (parts.length === 1) {
    // Top-level file (e.g. "index.ts") — group under root
    return "root";
  }

  if (parts.length === 2) {
    // e.g. "backend/index.ts" → "backend"
    return parts[0];
  }

  // 3+ segments: take first two (e.g. "backend/src/routes/graph.ts" → "backend/src")
  // But if part[1] is "src" and part[2] exists, go one deeper for clarity
  if (parts[1] === "src" && parts.length > 3) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  return `${parts[0]}/${parts[1]}`;
}

/**
 * Returns a human-readable display label for a module key.
 * e.g. "backend/src/routes" → "routes  (backend)"
 */
function moduleLabel(moduleKey: string): string {
  if (moduleKey === "external") return "External Packages";
  if (moduleKey === "root") return "Root";

  const parts = moduleKey.split("/");
  if (parts.length === 1) return parts[0];

  // Last segment is the most specific — put it first
  const name = parts[parts.length - 1];
  const parent = parts.slice(0, -1).join("/");
  return `${name}  (${parent})`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Takes the flat graph from the API and produces overview-level module nodes
 * + cross-module edges, ready to feed into GraphView.
 */
export function computeOverviewGraph(
  rawNodes: RawNode[],
  rawEdges: RawEdge[]
): HierarchyResult {
  // 1. Group raw nodes by module key
  const moduleMap = new Map<string, RawNode[]>();

  for (const node of rawNodes) {
    const key = getModuleKey(node);
    if (!moduleMap.has(key)) moduleMap.set(key, []);
    moduleMap.get(key)!.push(node);
  }

  // 2. Build ModuleNode objects
  const moduleNodes: ModuleNode[] = [];
  for (const [key, children] of moduleMap.entries()) {
    const allTags: string[] = Array.from(
      new Set(children.flatMap((n) => n.data.tags ?? []))
    );
    const fileCount = children.filter((n) => n.type === "file").length;

    moduleNodes.push({
      id: `module::${key}`,
      type: "module",
      label: moduleLabel(key),
      fileCount,
      nodeCount: children.length,
      tags: allTags,
      childIds: children.map((n) => n.id),
    });
  }

  // 3. Build a lookup: raw node id → module id
  const nodeToModule = new Map<string, string>();
  for (const [key, children] of moduleMap.entries()) {
    for (const n of children) {
      nodeToModule.set(n.id, `module::${key}`);
    }
  }

  // 4. Build cross-module edges (deduplicated, with weight)
  const edgeWeightMap = new Map<string, number>();
  const edgeLabelMap = new Map<string, string>();

  for (const edge of rawEdges) {
    const srcModule = nodeToModule.get(edge.source);
    const tgtModule = nodeToModule.get(edge.target);

    // Skip intra-module edges and self-loops
    if (!srcModule || !tgtModule || srcModule === tgtModule) continue;

    const edgeKey = `${srcModule}→${tgtModule}`;
    edgeWeightMap.set(edgeKey, (edgeWeightMap.get(edgeKey) ?? 0) + 1);
    // Prefer "imports" > "calls" > other
    const existing = edgeLabelMap.get(edgeKey);
    const incoming = edge.label ?? "connects";
    if (!existing || incoming === "imports") {
      edgeLabelMap.set(edgeKey, incoming);
    }
  }

  const moduleEdges: ModuleEdge[] = [];
  let edgeIdx = 0;
  for (const [edgeKey, weight] of edgeWeightMap.entries()) {
    const [src, tgt] = edgeKey.split("→");
    moduleEdges.push({
      id: `medge-${edgeIdx++}`,
      source: src,
      target: tgt,
      label: edgeLabelMap.get(edgeKey) ?? "connects",
      weight,
    });
  }

  return { moduleNodes, moduleEdges };
}

/**
 * Returns the raw nodes + edges that belong to a specific module,
 * ready to render as the Level 1 (drill-down) view.
 *
 * Only file-level and function/class nodes are included.
 * Intra-module edges only (cross-module edges are hidden in this view).
 */
export function drillIntoModule(
  moduleId: string,
  rawNodes: RawNode[],
  rawEdges: RawEdge[]
): { nodes: RawNode[]; edges: RawEdge[] } {
  // Strip the "module::" prefix to get the module key
  const moduleKey = moduleId.replace(/^module::/, "");

  // Filter nodes belonging to this module
  const childNodes = rawNodes.filter((n) => getModuleKey(n) === moduleKey);
  const childIds = new Set(childNodes.map((n) => n.id));

  // Keep only intra-module edges
  const childEdges = rawEdges.filter(
    (e) => childIds.has(e.source) && childIds.has(e.target)
  );

  return { nodes: childNodes, edges: childEdges };
}

/**
 * Helper — given a raw node id, return the module id it belongs to.
 * Used by CodeMapTab to decide whether a click is on a module or leaf node.
 */
export function getModuleIdForNode(
  nodeId: string,
  rawNodes: RawNode[]
): string {
  const node = rawNodes.find((n) => n.id === nodeId);
  if (!node) return "module::other";
  return `module::${getModuleKey(node)}`;
}
