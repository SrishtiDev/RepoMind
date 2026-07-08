import { useState, useEffect } from "react";
import { GraphView } from "./GraphView";
import { GuidedTour } from "./GuidedTour";
import { NodeDetailPanel, NodeData } from "./NodeDetailPanel";
import { fetchGraph } from "../../lib/api";

interface CodeMapTabProps {
  repoUrl: string;
}

/**
 * CodeMapTab.tsx - Main container for the exploratory map feature.
 * Fetches data, orchestrates the GraphView, Node detail panel, and Guided Tour.
 */
export function CodeMapTab({ repoUrl }: CodeMapTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  
  const [layerMode, setLayerMode] = useState<"structure" | "business">("structure");
  const [tourActive, setTourActive] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  useEffect(() => {
    if (!repoUrl) return;

    setLoading(true);
    setError(null);

    fetchGraph(repoUrl)
      .then((data) => {
        setGraphData(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [repoUrl]);

  // Extract all unique tags present in the actual graph for the tour
  const uniqueTags = Array.from(
    new Set(
      (graphData?.nodes || [])
        .flatMap((n) => n.data?.tags || [])
    )
  ).sort() as string[];

  const startTour = () => {
    if (uniqueTags.length === 0) return;
    setLayerMode("business"); // Switch mode automatically for semantics
    setTourActive(true);
    setActiveTag(uniqueTags[0]);
    setSelectedNode(null); 
  };

  const endTour = () => {
    setTourActive(false);
    setActiveTag(null);
  };

  return (
    <div className="w-full h-[800px] relative rounded-xl overflow-hidden border border-white/10 shadow-2xl" 
         style={{ background: 'radial-gradient(circle at center, #1a1511 0%, #0d0a08 100%)' }}>
         
      {/* Background Dot Texture */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#d4a24c]/30 border-t-[#d4a24c] rounded-full animate-spin mb-4" />
          <p className="text-[#d4a24c] font-medium tracking-wide">Mapping Codebase Anatomy...</p>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
            <span className="text-2xl">🗺️</span>
          </div>
          <p className="text-[#d4a24c] font-medium text-lg mb-2">{error}</p>
          <p className="text-white/40 text-sm max-w-md">Ensure the structural and semantic pipelines have successfully ingested this repository.</p>
        </div>
      )}

      {graphData && !loading && !error && (
        <>
          {/* Header Controls (Layer Toggle & Tour Start) */}
          <div className="absolute top-4 left-4 z-20 flex gap-4">
            <div className="bg-[#0d0a08]/90 backdrop-blur-md border border-white/10 rounded-lg p-1 flex shadow-lg">
              <button 
                onClick={() => setLayerMode("structure")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${layerMode === "structure" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                Structure
              </button>
              <button 
                onClick={() => setLayerMode("business")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${layerMode === "business" ? "bg-[#d4a24c]/20 text-[#d4a24c]" : "text-white/50 hover:text-[#d4a24c]/80"}`}
              >
                Business Logic
              </button>
            </div>

            {!tourActive && uniqueTags.length > 0 && (
              <button 
                onClick={startTour}
                className="bg-[#d4a24c]/10 hover:bg-[#d4a24c]/20 text-[#d4a24c] border border-[#d4a24c]/30 backdrop-blur-md px-4 py-1.5 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(212,162,76,0.1)] transition-all flex items-center gap-2"
              >
                Start Guided Tour
              </button>
            )}
          </div>

          <GraphView 
            initialNodes={graphData.nodes} 
            initialEdges={graphData.edges} 
            layerMode={layerMode}
            tourActiveTag={activeTag}
            onNodeClick={setSelectedNode}
          />
          
          <NodeDetailPanel nodeData={selectedNode} onClose={() => setSelectedNode(null)} />
          
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
