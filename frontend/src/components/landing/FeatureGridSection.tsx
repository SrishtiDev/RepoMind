"use client";

import { useEffect, useRef, useState } from "react";
import { Network, SearchCode, Tags, Layers, TerminalSquare, Map } from "lucide-react";

function useScrollFade(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );
    
    if (currentRef) observer.observe(currentRef);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

const features = [
  {
    icon: <Network size={22} />,
    title: "Interactive Code Graph",
    description: "Explore an interactive map of files, functions, and classes built from real AST parsing with tree-sitter—not just shallow text similarity.",
  },
  {
    icon: <SearchCode size={22} />,
    title: "Hybrid GraphRAG Retrieval",
    description: "Combines fast vector search with structural graph traversal. Answers about multi-file logic and deep dependencies never get missed.",
  },
  {
    icon: <Tags size={22} />,
    title: "Business Logic Tagging",
    description: "Functions and files are automatically grouped by semantic purpose, mapping raw syntax directly to concepts like authentication and payments.",
  },
  {
    icon: <Layers size={22} />,
    title: "Layer-Based Exploration",
    description: "Filter the noise. Instantly toggle between Frontend, Backend, Testing, or Deployment layers to focus entirely on the architectural slice you need.",
  },
  {
    icon: <TerminalSquare size={22} />,
    title: "Works Inside Your IDE",
    description: "Use RepoMind directly inside Claude Code, Cursor, and other tools via our built-in MCP server. No separate app or context switching required.",
  },
  {
    icon: <Map size={22} />,
    title: "Guided Code Tours",
    description: "Stop exploring blind. Step sequentially through tagged logic groups to understand how a specific feature was implemented from start to finish.",
  }
];

export default function FeatureGridSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollFade();
  const { ref: gridRef, isVisible: gridVisible } = useScrollFade(0.05);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <div 
        ref={headerRef}
        className={`mb-16 flex flex-col items-center text-center transition-all duration-[600ms] ease-out ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>
          Built for deep repository understanding
        </h2>
        <p className="mt-4 text-base text-gray-400 max-w-2xl">
          Everything you need to navigate, analyze, and query complex codebases faster and with total confidence.
        </p>
      </div>

      <div 
        ref={gridRef}
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-[600ms] delay-150 ease-out ${
          gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {features.map((feature, idx) => (
          <div 
            key={idx}
            className="group relative flex flex-col gap-4 rounded-2xl p-7 transition-all duration-150 ease-in-out hover:-translate-y-1"
            style={{ 
              background: "rgba(255,255,255,0.02)", 
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(109,92,232,0.4)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 30px rgba(109,92,232,0.12)";
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.035)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
            }}
          >
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200"
              style={{
                background: "rgba(109,92,232,0.1)",
                color: "#a78bfa"
              }}
            >
              {feature.icon}
            </div>
            
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-200">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
