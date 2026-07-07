"use client";

/**
 * GetStartedModal — reusable glassmorphism dialog that shows the MCP server
 * configuration snippet. Accepts isOpen / onClose props so both the Navbar
 * and the Hero CTA button can trigger it without duplicating state.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import CodeBlock from "./CodeBlock";

const MCP_CONFIG = `{
  "mcpServers": {
    "repomind": {
      "command": "node",
      "args": ["/home/srishti-rawat/Projects/RepoMind/repomind-mcp/dist/index.js"],
      "env": {
        "REPOMIND_API_URL": "http://localhost:3000"
      }
    }
  }
}`;

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Dark overlay — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      {/* Glassmorphism card */}
      <div
        className="relative w-full max-w-2xl rounded-2xl border p-8 shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Heading */}
        <h2 className="mb-2 text-xl font-semibold text-white">
          Add RepoMind to your IDE
        </h2>
        <p className="mb-6 text-sm text-gray-400">
          Paste this configuration into your MCP settings file to get started.
        </p>

        {/* Code block */}
        <CodeBlock code={MCP_CONFIG} language="json" />

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-gray-500">
          Works with Claude Code, Cursor, and other MCP-compatible tools.
        </p>
      </div>
    </div>
  );
}
