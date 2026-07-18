"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { NodeData } from "./NodeDetailPanel";
import { NodeLayer } from "./layerClassifier";

// Semantic tag colors
const TAG_COLORS: Record<string, string> = {
  auth: "#E63946",
  payment: "#F4A261",
  "data-layer": "#2A9D8F",
  "api-route": "#457B9D",
  validation: "#A8DADC",
  "error-handling": "#E76F51",
  config: "#264653",
  util: "#8AB17D",
  test: "#B5838D",
  "ui-component": "#FFB703",
  "external-integration": "#FB8500",
  "business-logic": "#d4a24c", // warm amber accent
  other: "#6C757D",
};

// Layer specific colors for the "all" view
const LAYER_BORDER_COLORS: Record<NodeLayer | "all", string> = {
  all: "#60a5fa", // fallback
  frontend: "#60a5fa", // blue
  backend: "#4ade80", // green
  testing: "#c084fc", // purple
  deployment: "#fb923c", // orange
  other: "#9ca3af", // gray
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR" }); // Left to Right tree view

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    // Dagre crashes if the graph contains self-loops (recursive calls).
    // We must ignore self-loops for the layout calculation.
    if (edge.source !== edge.target) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  try {
    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        throw new Error(`Dagre layout missing node: ${node.id}`);
      }
      return {
        ...node,
        targetPosition: "left" as any,
        sourcePosition: "right" as any,
        position: {
          x: nodeWithPosition.x - 90,
          y: nodeWithPosition.y - 30,
        },
      };
    });

    return { nodes: newNodes, edges };
  } catch (error) {
    console.error("[GraphView] Dagre layout failed:", error);
    // Fallback: arrange nodes in a simple grid instead of stacking them at 0,0
    let cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const newNodes = nodes.map((node, idx) => ({
      ...node,
      position: {
        x: (idx % cols) * 200,
        y: Math.floor(idx / cols) * 100,
      },
    }));
    return { nodes: newNodes, edges };
  }
};

interface Props {
  initialNodes: any[];
  initialEdges: any[];
  activeLayer: NodeLayer | "all";
  tourActiveTag: string | null;
  onNodeClick: (data: NodeData) => void;
}

/**
 * GraphView.tsx — The react-flow canvas rendering styled nodes and edges via dagre layout.
 * Includes hover effects, layered dimming, and smooth transitions.
 */
export function GraphView({
  initialNodes,
  initialEdges,
  activeLayer,
  tourActiveTag,
  onNodeClick,
}: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Hover state (tracking node id)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const formattedNodes = initialNodes.map((n) => ({
      ...n,
      data: { ...n.data, type: n.type, _dimmed: n._dimmed, nodeId: n.id },
      type: "default", // standard react-flow node type
    }));

    const formattedEdges = initialEdges.map((e) => ({
      ...e,
      type: "smoothstep",
      animated: e.label === "calls" || e.label === "imports",
      style: { stroke: "#ffffff30", strokeWidth: 1.5 },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      formattedNodes,
      formattedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges]);

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      const type = node.data.type;
      const tags = node.data.tags || [];
      const isDimmedByLayer = node.data._dimmed;
      const isHovered = hoveredNode === node.id;

      let bgColor = "#1a1614";
      let borderColor = LAYER_BORDER_COLORS[activeLayer] || "#333333";
      let opacity = 1;

      // Base color logic
      if (activeLayer === "all" && tags.length > 0) {
        // In "All" view, color by semantic tag if available
        bgColor = TAG_COLORS[tags[0]] || "#d4a24c";
        borderColor = bgColor;
        bgColor = `${bgColor}33`; // 20% opacity background
      } else if (activeLayer !== "all") {
        // In specific layer view, color by that layer
        borderColor = LAYER_BORDER_COLORS[activeLayer];
        bgColor = `${borderColor}33`;
      } else {
        // Fallback for untagged in "All" view
        if (type === "file") borderColor = "#60a5fa";
        else if (type === "class") borderColor = "#a78bfa";
        else borderColor = "#4ade80";
      }

      // Dimming logic
      if (isDimmedByLayer) {
        opacity = 0.15;
        borderColor = "#333333";
        bgColor = "#111111";
      }

      // Guided tour overrides
      if (tourActiveTag) {
        if (!tags.includes(tourActiveTag)) {
          opacity = 0.15; // Dim irrelevant nodes
          borderColor = "#333333";
        } else {
          opacity = 1;
          borderColor = "#d4a24c";
          bgColor = "#d4a24c33";
        }
      }

      return {
        ...node,
        style: {
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: type === "file" ? "8px" : "4px",
          color: "#fff",
          fontSize: "12px",
          padding: "10px",
          minWidth: "150px",
          opacity,
          cursor: "pointer",
          // Hover effects: subtle scale, amber glow box-shadow
          transform: isHovered ? "scale(1.02)" : "scale(1)",
          boxShadow: isHovered ? "0 0 10px rgba(212, 162, 76, 0.4)" : "none",
          transition: "transform 150ms ease-out, box-shadow 150ms ease-out, opacity 300ms ease",
          zIndex: isHovered ? 10 : 1, // Bring hovered node to front
        },
        data: {
          ...node.data,
          label: (
            <div
              className="flex flex-col items-start overflow-hidden w-full h-full"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <span className="text-[10px] text-white/50 uppercase tracking-wide">{type}</span>
              <span className="font-mono truncate w-full" title={node.data.label}>
                {node.data.label}
              </span>
            </div>
          ),
        },
      };
    });
  }, [nodes, activeLayer, tourActiveTag, hoveredNode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick(node.data as NodeData)}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        className="touch-none"
      >
        <Background color="#ffffff" gap={20} size={1} className="opacity-10" />
        <Controls className="bg-[#1a1614] border border-white/10 fill-white" />
      </ReactFlow>
    </div>
  );
}
