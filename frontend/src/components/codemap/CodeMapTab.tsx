"use client";

import { useState, useEffect, useMemo } from "react";
import { GraphView } from "./GraphView";
import { GuidedTour } from "./GuidedTour";
import { NodeDetailPanel, NodeData } from "./NodeDetailPanel";
import { BreadcrumbNav, NavLevel } from "./BreadcrumbNav";
import { fetchGraph } from "../../lib/api";
import { classifyNodeLayer, NodeLayer } from "./layerClassifier";
import {
  computeOverviewGraph,
  drillIntoModule,
  ModuleNode,
} from "./graphHierarchy";

interface CodeMapTabProps {
  repoUrl: string;
}

type LayerFilter = NodeLayer | "all";

const LAYER_LABELS: Record<LayerFilter, string> = {
  all: "All",
  frontend: "Frontend",
  backend: "Backend",
  testing: "Testing",
  deployment: "Deployment",
  other: "Other",
};

const LAYER_COLORS: Record<LayerFilter, string> = {
  all: "text-white bg-white/10",
  frontend: "text-blue-300 bg-blue-400/10 border-blue-400/30",
  backend: "text-green-300 bg-green-400/10 border-green-400/30",
  testing: "text-purple-300 bg-purple-400/10 border-purple-400/30",
  deployment: "text-orange-300 bg-orange-400/10 border-orange-400/30",
  other: "text-gray-400 bg-gray-400/10 border-gray-400/30",
};

const ACTIVE_LAYER_COLORS: Record<LayerFilter, string> = {
  all: "bg-white/20 text-white border-white/30",
  frontend: "bg-blue-400/20 text-blue-200 border-blue-400/50",
  backend: "bg-green-400/20 text-green-200 border-green-400/50",
  testing: "bg-purple-400/20 text-purple-200 border-purple-400/50",
  deployment: "bg-orange-400/20 text-orange-200 border-orange-400/50",
  other: "bg-gray-400/20 text-gray-300 border-gray-400/50",
};

/**
 * CodeMapTab.tsx — Main container for the Code Map feature.
 *
 * Navigation model (2-level hierarchy):
 *   Level 0 (Overview)  — synthetic module nodes, ~8-12 cards grouped by directory
 *   Level 1 (Drill-down) — raw file/function nodes inside the clicked module
 *   Right Panel          — NodeDetailPanel (code snippet, tags, connections)
 *
 * The full flat graph is fetched once. All hierarchy is computed client-side
 * via graphHierarchy.ts — no extra API calls.
 */
export function CodeMapTab({ repoUrl }: CodeMapTabProps) {
  // ── Raw graph data (fetched once) ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  // ── Navigation stack ───────────────────────────────────────────────────────
  // navStack[0] is always { level: "overview" }
  // navStack[1] is { level: "module", moduleId, label } when drilled in
  const [navStack, setNavStack] = useState<NavLevel[]>([{ level: "overview" }]);

  // ── Layer filter (only meaningful at drill-down level) ────────────────────
  const [activeLayer, setActiveLayer] = useState<LayerFilter>("all");

  // ── Guided Tour ────────────────────────────────────────────────────────────
  const [tourActive, setTourActive] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // ── Selected leaf node ─────────────────────────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // ── Fetch graph data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!repoUrl) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setNavStack([{ level: "overview" }]);

    fetchGraph(repoUrl)
      .then((data) => {
        console.log(`[CodeMapTab] Fetched graph for ${repoUrl}: ${data.nodes.length} nodes`);
        setGraphData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoUrl]);

  // ── Derived: current nav level ─────────────────────────────────────────────
  const currentLevel = navStack[navStack.length - 1];
  const isOverview = currentLevel.level === "overview";

  // ── Derived: Overview graph (module nodes + cross-module edges) ────────────
  const overviewGraph = useMemo(() => {
    if (!graphData) return { moduleNodes: [], moduleEdges: [] };
    return computeOverviewGraph(graphData.nodes, graphData.edges);
  }, [graphData]);

  // ── Derived: layer counts (from raw nodes inside current module or all) ────
  const layerCounts = useMemo((): Record<LayerFilter, number> => {
    const counts: Record<LayerFilter, number> = {
      all: 0, frontend: 0, backend: 0, testing: 0, deployment: 0, other: 0,
    };
    if (!graphData) return counts;

    const sourceNodes = isOverview
      ? graphData.nodes
      : drillIntoModule(currentLevel.moduleId!, graphData.nodes, graphData.edges).nodes;

    counts.all = sourceNodes.length;
    sourceNodes.forEach((n) => {
      const layer = classifyNodeLayer(n);
      counts[layer] = (counts[layer] ?? 0) + 1;
    });
    return counts;
  }, [graphData, isOverview, currentLevel]);

  // ── Derived: nodes/edges to render in GraphView ────────────────────────────
  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (!graphData) return { visibleNodes: [], visibleEdges: [] };

    if (isOverview) {
      // Render synthetic module nodes
      return {
        visibleNodes: overviewGraph.moduleNodes,
        visibleEdges: overviewGraph.moduleEdges,
      };
    }

    // Drill-down: get raw nodes/edges for this module
    const { nodes: drillNodes, edges: drillEdges } = drillIntoModule(
      currentLevel.moduleId!,
      graphData.nodes,
      graphData.edges
    );

    // Apply layer filter on top of drill-down
    if (activeLayer === "all") {
      return { visibleNodes: drillNodes, visibleEdges: drillEdges };
    }

    const filteredNodes = drillNodes.filter(
      (n) => classifyNodeLayer(n) === activeLayer
    );
    const filteredIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = drillEdges.filter(
      (e) => filteredIds.has(e.source) && filteredIds.has(e.target)
    );
    return { visibleNodes: filteredNodes, visibleEdges: filteredEdges };
  }, [graphData, isOverview, currentLevel, overviewGraph, activeLayer]);

  // ── Derived: connections for NodeDetailPanel ───────────────────────────────
  const selectedConnections = useMemo(() => {
    if (!selectedNode || !graphData || !selectedNode.nodeId) return [];
    const nodeId = selectedNode.nodeId;
    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, n]));

    return graphData.edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => {
        const isOutgoing = e.source === nodeId;
        const peerId = isOutgoing ? e.target : e.source;
        const peer = nodeMap.get(peerId);
        return {
          direction: (isOutgoing ? "outgoing" : "incoming") as "outgoing" | "incoming",
          label: e.label ?? (isOutgoing ? "connects to" : "connected from"),
          targetLabel: peer?.data?.label ?? peerId,
          targetFile: peer?.data?.filepath ?? "",
        };
      });
  }, [selectedNode, graphData]);

  // ── Guided Tour helpers ────────────────────────────────────────────────────
  const uniqueTags = useMemo(() =>
    Array.from(new Set((graphData?.nodes || []).flatMap((n) => n.data?.tags || []))).sort() as string[],
    [graphData]
  );

  const startTour = () => {
    if (uniqueTags.length === 0) return;
    setTourActive(true);
    setActiveTag(uniqueTags[0]);
    setSelectedNode(null);
  };

  const endTour = () => {
    setTourActive(false);
    setActiveTag(null);
  };

  // ── Navigation handlers ────────────────────────────────────────────────────

  /** Called when user clicks a module node in the overview */
  const handleModuleClick = (moduleNode: ModuleNode) => {
    setNavStack([
      { level: "overview" },
      { level: "module", moduleId: moduleNode.id, label: moduleNode.label },
    ]);
    setSelectedNode(null);
    setActiveLayer("all");
  };

  /** Called when user clicks a breadcrumb crumb */
  const handleBreadcrumbNavigate = (index: number) => {
    setNavStack((prev) => prev.slice(0, index + 1));
    setSelectedNode(null);
    setActiveLayer("all");
  };

  const VISIBLE_LAYERS: LayerFilter[] = ["all", "frontend", "backend", "testing", "deployment"];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="w-full h-[800px] relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ background: "radial-gradient(circle at center, #1a1511 0%, #0d0a08 100%)" }}
    >
      {/* Background dot texture */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#d4a24c]/30 border-t-[#d4a24c] rounded-full animate-spin mb-4" />
          <p className="text-[#d4a24c] font-medium tracking-wide">Mapping Codebase Anatomy...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
            <span className="text-2xl">🗺️</span>
          </div>
          <p className="text-[#d4a24c] font-medium text-lg mb-2">{error}</p>
          <p className="text-white/40 text-sm max-w-md mb-4">
            Ensure the structural and semantic pipelines have successfully ingested this repository.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchGraph(repoUrl)
                .then((data) => setGraphData(data))
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 bg-[#d4a24c]/10 hover:bg-[#d4a24c]/20 text-[#d4a24c] rounded-md transition-colors border border-[#d4a24c]/30 font-medium shadow-[0_0_15px_rgba(212,162,76,0.1)]"
          >
            Refresh Map
          </button>
        </div>
      )}

      {/* Empty */}
      {graphData && !loading && !error && graphData.nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
            <span className="text-2xl">🕳️</span>
          </div>
          <p className="text-gray-400 font-medium text-lg mb-2">
            No graph data found — structural analysis may still be processing.
          </p>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      {graphData && !loading && !error && graphData.nodes.length > 0 && (
        <>
          {/* ── Top toolbar ─────────────────────────────────────────────── */}
          <div className="absolute top-4 left-4 z-20 flex gap-3 flex-wrap items-center">

            {/* Overview label / back hint when in overview mode */}
            {isOverview && (
              <div className="bg-[#d4a24c]/10 border border-[#d4a24c]/30 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg">
                <span className="text-lg">🏗️</span>
                <span className="text-[#d4a24c] text-xs font-semibold tracking-wide">Architecture Overview</span>
                <span className="text-white/30 text-xs">· click a module to explore</span>
              </div>
            )}

            {/* Layer filter tabs — only shown when drilled in */}
            {!isOverview && (
              <div className="bg-[#0d0a08]/90 backdrop-blur-md border border-white/10 rounded-lg p-1 flex gap-1 shadow-lg">
                {VISIBLE_LAYERS.map((layer) => {
                  const count = layerCounts[layer];
                  const isActive = activeLayer === layer;
                  return (
                    <button
                      key={layer}
                      onClick={() => setActiveLayer(layer)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border
                        ${isActive
                          ? ACTIVE_LAYER_COLORS[layer]
                          : "text-white/40 border-transparent hover:text-white/70"
                        }`}
                    >
                      {LAYER_LABELS[layer]}
                      {layer !== "all" && count > 0 && (
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full
                          ${isActive ? "bg-white/20" : "bg-white/10"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Guided Tour button */}
            {!tourActive && uniqueTags.length > 0 && (
              <button
                onClick={startTour}
                className="bg-[#d4a24c]/10 hover:bg-[#d4a24c]/20 text-[#d4a24c] border border-[#d4a24c]/30 backdrop-blur-md px-4 py-1.5 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(212,162,76,0.1)] transition-all flex items-center gap-2"
              >
                Start Guided Tour
              </button>
            )}
          </div>

          {/* ── Breadcrumb nav (hidden at overview level) ────────────────── */}
          <BreadcrumbNav navStack={navStack} onNavigate={handleBreadcrumbNavigate} />

          {/* ── Graph canvas ─────────────────────────────────────────────── */}
          <GraphView
            initialNodes={visibleNodes}
            initialEdges={visibleEdges}
            activeLayer={activeLayer}
            tourActiveTag={activeTag}
            isOverview={isOverview}
            onModuleClick={handleModuleClick}
            onNodeClick={(data) =>
              setSelectedNode({ ...data, repoUrl, nodeId: data.nodeId })
            }
          />

          {/* ── Node detail panel (right side) ───────────────────────────── */}
          <NodeDetailPanel
            nodeData={selectedNode}
            connections={selectedConnections}
            onClose={() => setSelectedNode(null)}
          />

          {tourActive && (
            <GuidedTour
              tagsInGraph={uniqueTags}
              activeTag={activeTag}
              setActiveTag={setActiveTag}
              onClose={endTour}
            />
          )}
        </>
      )}
    </div>
  );
}
