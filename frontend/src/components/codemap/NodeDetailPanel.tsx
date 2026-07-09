"use client";
import { X, FileCode, Tag, Link2, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchNodeSnippet } from "../../lib/api";

export interface NodeData {
  label: string;
  filepath: string;
  type: string;
  tags: string[];
  startLine?: number;
  endLine?: number;
  // Injected by CodeMapTab so the panel can show connections
  repoUrl?: string;
  nodeId?: string;
}

interface Connection {
  direction: "outgoing" | "incoming";
  label: string; // edge type e.g. "calls", "imports"
  targetLabel: string;
  targetFile: string;
}

interface Props {
  nodeData: NodeData | null;
  connections: Connection[];
  onClose: () => void;
}

/**
 * NodeDetailPanel.tsx — Slide-in side panel with:
 *   - Header: node name + type badge
 *   - Filepath (monospace)
 *   - Semantic tag pills (amber)
 *   - Code snippet (fetched from /graph/node-snippet)
 *   - Connections list (calls / imported-by)
 *   - Close button
 *
 * Animates in from the right using translate-x + opacity.
 * Glassmorphism background consistent with CodeMapTab.
 */
export function NodeDetailPanel({ nodeData, connections, onClose }: Props) {
  const [snippet, setSnippet] = useState<string | null>(null);
  const [snippetLoading, setSnippetLoading] = useState(false);
  const [snippetError, setSnippetError] = useState<string | null>(null);

  const visible = nodeData !== null;

  // Fetch code snippet whenever node changes
  useEffect(() => {
    if (!nodeData || !nodeData.filepath || !nodeData.repoUrl) {
      setSnippet(null);
      return;
    }

    setSnippetLoading(true);
    setSnippetError(null);
    setSnippet(null);

    fetchNodeSnippet(
      nodeData.repoUrl,
      nodeData.filepath,
      nodeData.startLine,
      nodeData.endLine,
    )
      .then((res) => setSnippet(res.snippet))
      .catch((err) => setSnippetError(err.message))
      .finally(() => setSnippetLoading(false));
  }, [nodeData?.nodeId]);

  const TYPE_ICONS: Record<string, string> = {
    file: "📄",
    function: "𝑓",
    class: "◈",
    method: "→",
  };

  return (
    <div
      className={`absolute top-0 right-0 h-full w-96 z-30 flex flex-col
        transform transition-all duration-300 ease-out
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}`}
    >
      {/* Glassmorphism panel */}
      <div className="h-full flex flex-col bg-[#0d0a08]/80 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-hidden">
        
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{TYPE_ICONS[nodeData?.type ?? ""] ?? "◻"}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#d4a24c]/70 border border-[#d4a24c]/30 px-2 py-0.5 rounded-full">
                {nodeData?.type ?? ""}
              </span>
            </div>
            <h3 className="text-[#d4a24c] font-semibold text-base break-words leading-tight font-mono">
              {nodeData?.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-white/40 hover:text-white/90 hover:bg-white/10 rounded-lg p-1.5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Filepath */}
          <div>
            <p className="flex items-center gap-1.5 text-white/40 uppercase text-[10px] font-bold mb-2 tracking-widest">
              <FileCode className="w-3 h-3" /> File Path
            </p>
            <code className="text-[#a3a3a3] text-xs break-all bg-white/5 rounded-md p-2.5 block leading-relaxed border border-white/5">
              {nodeData?.filepath}
            </code>
            {nodeData?.startLine !== undefined && (
              <p className="text-white/30 text-xs mt-1 font-mono pl-1">
                Lines {nodeData.startLine}–{nodeData.endLine}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <p className="flex items-center gap-1.5 text-white/40 uppercase text-[10px] font-bold mb-2 tracking-widest">
              <Tag className="w-3 h-3" /> Semantic Tags
            </p>
            {nodeData?.tags && nodeData.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {nodeData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-[#d4a24c]/15 text-[#d4a24c] rounded-full text-xs border border-[#d4a24c]/30 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/30 italic text-xs">No semantic tags.</p>
            )}
          </div>

          {/* Code Snippet */}
          <div>
            <p className="flex items-center gap-1.5 text-white/40 uppercase text-[10px] font-bold mb-2 tracking-widest">
              ⌥ Code Snippet
            </p>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              {/* snippet header bar */}
              <div className="bg-white/5 px-3 py-1.5 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="text-white/30 text-xs font-mono truncate">{nodeData?.filepath?.split("/").pop()}</span>
              </div>

              {snippetLoading && (
                <div className="flex items-center justify-center py-8 bg-[#0a0807]">
                  <div className="w-5 h-5 border-2 border-[#d4a24c]/30 border-t-[#d4a24c] rounded-full animate-spin" />
                </div>
              )}
              {snippetError && !snippetLoading && (
                <div className="py-4 px-3 bg-[#0a0807] text-white/30 text-xs italic">
                  {snippetError}
                </div>
              )}
              {snippet && !snippetLoading && (
                <pre className="text-[11px] text-[#c9c9c9] bg-[#0a0807] p-3 overflow-x-auto leading-relaxed max-h-56">
                  <code>{snippet}</code>
                </pre>
              )}
              {!snippet && !snippetLoading && !snippetError && (
                <div className="py-4 px-3 bg-[#0a0807] text-white/20 text-xs italic">
                  No snippet available for this node.
                </div>
              )}
            </div>
          </div>

          {/* Connections */}
          <div>
            <p className="flex items-center gap-1.5 text-white/40 uppercase text-[10px] font-bold mb-2 tracking-widest">
              <Link2 className="w-3 h-3" /> Connections
            </p>
            {connections.length > 0 ? (
              <ul className="space-y-1.5">
                {connections.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2 border border-white/5"
                  >
                    <ChevronRight
                      className={`w-3 h-3 mt-0.5 shrink-0 ${c.direction === "outgoing" ? "text-[#d4a24c]" : "text-blue-400 rotate-180"}`}
                    />
                    <span>
                      <span className="text-white/40 italic">{c.label}: </span>
                      <span className="text-white/80 font-mono">{c.targetLabel}</span>
                      {c.targetFile && (
                        <span className="text-white/30 ml-1 text-[10px]">in {c.targetFile.split("/").pop()}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/30 italic text-xs">No direct connections.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
