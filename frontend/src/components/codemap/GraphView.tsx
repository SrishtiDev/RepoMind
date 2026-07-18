"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
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
  Handle,
  Position,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { NodeData } from "./NodeDetailPanel";
import { NodeLayer } from "./layerClassifier";

// ─── Design Tokens ────────────────────────────────────────────────────────────

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
  "business-logic": "#d4a24c",
  other: "#6C757D",
};

const LAYER_BORDER_COLORS: Record<NodeLayer | "all", string> = {
  all: "#60a5fa",
  frontend: "#60a5fa",
  backend: "#4ade80",
  testing: "#c084fc",
  deployment: "#fb923c",
  other: "#9ca3af",
};

// Kind → short badge label
const KIND_BADGE: Record<string, string> = {
  file: "FILE",
  function: "FN",
  class: "CLASS",
  external: "PKG",
};

// Kind → badge colour (dark, distinguishable)
const KIND_BADGE_COLOR: Record<string, string> = {
  file: "#60a5fa",
  function: "#4ade80",
  class: "#a78bfa",
  external: "#fb923c",
};

// Node width/height used BOTH by the custom renderer and by dagre.
// They must match so dagre reserves the right amount of space.
const NODE_W = 180;
const NODE_H = 56;

// ─── Custom Node Renderer ─────────────────────────────────────────────────────

/**
 * CodeNode — replaces the previous "JSX stuffed into data.label" approach.
 *
 * Renders:
 *   [BADGE] Bold human-readable name   (e.g.  FN  processIngestionJob)
 *            dim filepath subtitle      (e.g.  queue/worker.ts)
 *
 * Full filepath is in the `title` tooltip.
 * Border colour follows semantic tag > kind fallback.
 */
const CodeNode = memo(({ data, selected }: NodeProps) => {
  const kind: string = data.kind ?? "file";
  const displayName: string = data.displayName ?? data.label ?? "—";
  const subtitle: string = data.subtitle ?? "";
  const borderColor: string = data.borderColor ?? KIND_BADGE_COLOR[kind] ?? "#60a5fa";
  const bgColor: string = data.bgColor ?? "#1a1614";
  const opacity: number = data.opacity ?? 1;
  const badge = KIND_BADGE[kind] ?? kind.toUpperCase().slice(0, 4);
  const badgeColor = KIND_BADGE_COLOR[kind] ?? "#60a5fa";

  return (
    <div
      title={data.label}
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        background: bgColor,
        border: `1px solid ${selected ? "#d4a24c" : borderColor}`,
        borderRadius: kind === "file" ? "8px" : "5px",
        opacity,
        boxShadow: selected
          ? `0 0 0 2px #d4a24c55, 0 0 12px #d4a24c33`
          : `0 1px 6px rgba(0,0,0,0.5)`,
        transition: "opacity 250ms ease, box-shadow 150ms ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "8px 10px",
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Source handle */}
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 6, height: 6, border: "none" }} />
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 6, height: 6, border: "none" }} />

      {/* Badge + name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: badgeColor,
            background: `${badgeColor}22`,
            border: `1px solid ${badgeColor}55`,
            borderRadius: 3,
            padding: "1px 4px",
            flexShrink: 0,
            lineHeight: "14px",
          }}
        >
          {badge}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#f0f0f0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            fontFamily: "ui-monospace, 'Cascadia Code', monospace",
          }}
        >
          {displayName}
        </span>
      </div>

      {/* Subtitle (file path for non-file nodes) */}
      {subtitle && (
        <span
          style={{
            fontSize: 10,
            color: "#ffffff50",
            fontFamily: "ui-monospace, 'Cascadia Code', monospace",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginTop: 3,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
});
CodeNode.displayName = "CodeNode";

// Register once, outside component so reference is stable across re-renders.
// React Flow v11 requires nodeTypes to be stable (not re-created per render).
const NODE_TYPES = { codeNode: CodeNode };

// ─── Dagre Layout ─────────────────────────────────────────────────────────────

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: 40,   // vertical gap between nodes in the same rank (was default ~10)
    ranksep: 80,   // horizontal gap between ranks (was default ~30)
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_W, height: NODE_H });
  });

  edges.forEach((edge) => {
    if (edge.source !== edge.target) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  try {
    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
      const pos = dagreGraph.node(node.id);
      if (!pos) throw new Error(`Dagre missing node: ${node.id}`);
      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        position: {
          x: pos.x - NODE_W / 2,
          y: pos.y - NODE_H / 2,
        },
      };
    });

    return { nodes: newNodes, edges };
  } catch (err) {
    console.error("[GraphView] Dagre layout failed — using grid fallback:", err);
    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    return {
      nodes: nodes.map((node, i) => ({
        ...node,
        position: { x: (i % cols) * (NODE_W + 40), y: Math.floor(i / cols) * (NODE_H + 30) },
      })),
      edges,
    };
  }
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialNodes: any[];
  initialEdges: any[];
  activeLayer: NodeLayer | "all";
  tourActiveTag: string | null;
  onNodeClick: (data: NodeData) => void;
}

// ─── GraphView ────────────────────────────────────────────────────────────────

/**
 * GraphView — React Flow canvas with:
 *   - Custom `codeNode` node type (replaces JSX-in-data.label hack)
 *   - `contains` edges rendered unlabeled + low opacity (ends the chip flood)
 *   - Dagre layout with sane nodesep/ranksep for 200+ node graphs
 *   - fitView with maxZoom cap so initial view is legible
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

  useEffect(() => {
    // ── 1. Transform backend nodes → codeNode shape ────────────────────────
    const formattedNodes: Node[] = initialNodes.map((n) => {
      const kind: string = n.type ?? "file";
      const rawLabel: string = n.data?.label ?? n.id;

      // Human-readable display name:
      //   file     → basename of the filepath (e.g. "graphBuilder.ts")
      //   function/class → symbol name (already in label)
      //   external → strip "external:" prefix, keep package name
      let displayName: string;
      if (kind === "file") {
        displayName = rawLabel.split("/").pop() ?? rawLabel;
      } else if (kind === "external") {
        displayName = rawLabel.replace(/^external:/, "");
      } else {
        displayName = rawLabel;
      }

      // Subtitle shows the parent filepath for non-file nodes
      let subtitle = "";
      if (kind !== "file" && kind !== "external" && n.data?.filepath) {
        const fp: string = n.data.filepath;
        // Show only last two path segments to keep it compact
        const parts = fp.split("/");
        subtitle = parts.slice(-2).join("/");
      }

      return {
        id: n.id,
        // MUST be the key registered in NODE_TYPES
        type: "codeNode",
        position: { x: 0, y: 0 },
        data: {
          // Preserve all original data for NodeDetailPanel
          ...n.data,
          // Extra computed fields consumed by CodeNode renderer
          kind,
          displayName,
          subtitle,
          label: rawLabel,        // full label kept for tooltip + NodeDetailPanel
          type: kind,             // CodeMapTab reads data.type for styledNodes
          nodeId: n.id,
          // Styling fields — computed later in styledNodes; set defaults here
          borderColor: KIND_BADGE_COLOR[kind] ?? "#60a5fa",
          bgColor: "#1a1614",
          opacity: 1,
        },
      };
    });

    // ── 2. Transform edges ─────────────────────────────────────────────────
    //
    // ROOT CAUSE FIX: `contains` edges previously got a `label` prop which
    // React Flow renders as a white chip. For `contains` we:
    //   - omit the label entirely  (no chip)
    //   - reduce stroke opacity    (structural scaffolding, not business logic)
    //   - make them non-animated   (reduces visual noise)
    //
    // `imports`, `calls`, `extends` keep their labels but we use a compact
    // pill style via `labelStyle` / `labelBgStyle` rather than the default
    // prominent white box.
    //
    const formattedEdges: Edge[] = initialEdges.map((e) => {
      const isContains = e.label === "contains";
      return {
        ...e,
        type: "smoothstep",
        animated: e.label === "calls",
        // No label for contains; short label for the rest
        label: isContains ? undefined : e.label,
        labelStyle: { fontSize: 9, fill: "#ffffff90", fontWeight: 500 },
        labelBgStyle: { fill: "#1a1614dd", fillOpacity: 0.85, rx: 4, ry: 4 },
        labelBgPadding: [3, 5] as [number, number],
        style: {
          stroke: isContains ? "#ffffff18" : "#ffffff55",
          strokeWidth: isContains ? 1 : 1.5,
          strokeDasharray: isContains ? "3 4" : undefined,
        },
      };
    });

    // ── 3. Dagre layout ────────────────────────────────────────────────────
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      formattedNodes,
      formattedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges]);

  // ── 4. Style nodes dynamically (layer filter + tour dimming + hover) ─────
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      const kind: string = node.data.kind ?? "file";
      const tags: string[] = node.data.tags ?? [];

      // Border colour logic: tag > layer > kind fallback
      let borderColor = KIND_BADGE_COLOR[kind] ?? "#60a5fa";
      let bgColor = "#1a1614";

      if (activeLayer === "all" && tags.length > 0) {
        borderColor = TAG_COLORS[tags[0]] ?? "#d4a24c";
        bgColor = `${borderColor}22`;
      } else if (activeLayer !== "all") {
        borderColor = LAYER_BORDER_COLORS[activeLayer];
        bgColor = `${borderColor}18`;
      }

      // Dimming
      let opacity = 1;
      if (node.data._dimmed) {
        opacity = 0.12;
        borderColor = "#333";
        bgColor = "#111";
      }

      // Guided tour override
      if (tourActiveTag) {
        if (!tags.includes(tourActiveTag)) {
          opacity = 0.12;
          borderColor = "#333";
          bgColor = "#111";
        } else {
          opacity = 1;
          borderColor = "#d4a24c";
          bgColor = "#d4a24c22";
        }
      }

      // Hover glow
      const isHovered = hoveredNode === node.id;

      return {
        ...node,
        data: {
          ...node.data,
          borderColor,
          bgColor,
          opacity: isHovered ? Math.min(opacity + 0.1, 1) : opacity,
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
    <div
      className="w-full h-full relative"
      onMouseLeave={() => setHoveredNode(null)}
    >
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          setHoveredNode(node.id);
          onNodeClick(node.data as NodeData);
        }}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 0.85 }}
        minZoom={0.05}
        maxZoom={2}
        className="touch-none"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#ffffff" gap={24} size={1} className="opacity-[0.04]" />
        <Controls className="bg-[#1a1614] border border-white/10 fill-white" />
      </ReactFlow>
    </div>
  );
}
