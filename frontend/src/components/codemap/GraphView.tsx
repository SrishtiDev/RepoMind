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
  ConnectionLineType
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { NodeData } from "./NodeDetailPanel";

const TAG_COLORS: Record<string, string> = {
  "auth": "#E63946",
  "payment": "#F4A261",
  "data-layer": "#2A9D8F",
  "api-route": "#457B9D",
  "validation": "#A8DADC",
  "error-handling": "#E76F51",
  "config": "#264653",
  "util": "#8AB17D",
  "test": "#B5838D",
  "ui-component": "#FFB703",
  "external-integration": "#FB8500",
  "business-logic": "#d4a24c", // warm amber accent
  "other": "#6C757D"
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR' }); // Left to Right tree view

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'left' as any,
      sourcePosition: 'right' as any,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 30,
      },
    };
  });

  return { nodes: newNodes, edges };
};

interface Props {
  initialNodes: any[];
  initialEdges: any[];
  layerMode: "structure" | "business";
  tourActiveTag: string | null;
  onNodeClick: (data: NodeData) => void;
}

/**
 * GraphView.tsx - The react-flow canvas rendering styled nodes and edges via dagre layout.
 */
export function GraphView({ initialNodes, initialEdges, layerMode, tourActiveTag, onNodeClick }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const formattedNodes = initialNodes.map(n => ({
      ...n,
      data: { ...n.data, type: n.type },
      type: 'default', // standard react-flow node type
    }));
    
    const formattedEdges = initialEdges.map(e => ({
      ...e,
      type: 'smoothstep',
      animated: e.label === "calls" || e.label === "imports",
      style: { stroke: '#ffffff30', strokeWidth: 1.5 }
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      formattedNodes,
      formattedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges]);

  const styledNodes = useMemo(() => {
    return nodes.map(node => {
      const type = node.data.type;
      const tags = node.data.tags || [];
      
      let bgColor = "#1a1614";
      let borderColor = "#333333";
      let opacity = 1;
      
      // Node coloring logic based on toggle state
      if (layerMode === "business" && tags.length > 0) {
        bgColor = TAG_COLORS[tags[0]] || "#d4a24c";
        borderColor = bgColor;
        bgColor = `${bgColor}33`; // 20% opacity background
      } else if (layerMode === "structure") {
        if (type === "file") borderColor = "#60a5fa"; 
        else if (type === "class") borderColor = "#a78bfa"; 
        else borderColor = "#4ade80"; 
      }

      // Guided tour overrides
      if (tourActiveTag) {
        if (!tags.includes(tourActiveTag)) {
          opacity = 0.15; // Dim irrelevant nodes
        } else {
          borderColor = "#d4a24c";
          bgColor = "#d4a24c33";
        }
      }

      return {
        ...node,
        style: {
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: type === 'file' ? '8px' : '4px',
          color: '#fff',
          fontSize: '12px',
          padding: '10px',
          minWidth: '150px',
          opacity,
          transition: 'all 0.3s ease'
        },
        data: {
          ...node.data,
          label: (
             <div className="flex flex-col items-start overflow-hidden">
               <span className="text-[10px] text-white/50 uppercase tracking-wide">{type}</span>
               <span className="font-mono truncate w-full" title={node.data.label}>{node.data.label}</span>
             </div>
          )
        }
      };
    });
  }, [nodes, layerMode, tourActiveTag]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

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
