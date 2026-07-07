"use client";

/**
 * CodeBlock — dark terminal/editor-style snippet with a copy-to-clipboard
 * button. Used in GetStartedModal and the "30 seconds" setup section.
 * Props: code (string), language (optional label), className (optional).
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export default function CodeBlock({ code, language, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ background: "#0d0d17", border: "1px solid rgba(109,92,232,0.25)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          {language && (
            <span className="ml-2 text-xs font-medium text-gray-500">{language}</span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200"
          style={{
            color: copied ? "#10b981" : "#9ca3af",
            background: copied ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre
        className="overflow-x-auto p-5 text-sm leading-relaxed"
        style={{ fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace" }}
      >
        <SyntaxHighlight code={code} />
      </pre>
    </div>
  );
}

/**
 * Lightweight inline syntax highlighter for JSON and shell commands.
 * No external dependencies — just regex-based span injection rendered as JSX.
 */
function SyntaxHighlight({ code }: { code: string }) {
  const lines = code.split("\n");

  return (
    <>
      {lines.map((line, i) => (
        <div key={i}>
          <HighlightLine line={line} />
          {i < lines.length - 1 && "\n"}
        </div>
      ))}
    </>
  );
}

function HighlightLine({ line }: { line: string }) {
  // Shell comment lines
  if (line.trim().startsWith("#")) {
    return <span style={{ color: "#6b7280" }}>{line}</span>;
  }

  // Shell command lines (starts with $ or cd/npm/node/npx)
  if (/^\s*(\$|npm|node|npx|cd |git )/.test(line)) {
    const parts = line.split(/(\s+)/);
    return (
      <>
        {parts.map((part, i) =>
          i === 0 ? (
            <span key={i} style={{ color: "#a78bfa" }}>{part}</span>
          ) : (
            <span key={i} style={{ color: "#e5e7eb" }}>{part}</span>
          )
        )}
      </>
    );
  }

  // JSON: strings, numbers, booleans, punctuation
  const segments = tokenizeJson(line);
  return (
    <>
      {segments.map((seg, i) => (
        <span key={i} style={{ color: seg.color }}>
          {seg.text}
        </span>
      ))}
    </>
  );
}

type Segment = { text: string; color: string };

function tokenizeJson(line: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < line.length) {
    // Leading whitespace
    if (line[i] === " " || line[i] === "\t") {
      let ws = "";
      while (i < line.length && (line[i] === " " || line[i] === "\t")) ws += line[i++];
      segments.push({ text: ws, color: "#e5e7eb" });
      continue;
    }

    // String
    if (line[i] === '"') {
      let str = '"';
      i++;
      while (i < line.length && line[i] !== '"') {
        if (line[i] === "\\") str += line[i++];
        str += line[i++];
      }
      str += '"';
      i++;
      // Detect if it's a key (followed by optional whitespace + colon)
      const rest = line.slice(i).trimStart();
      const isKey = rest.startsWith(":");
      segments.push({ text: str, color: isKey ? "#93c5fd" : "#86efac" });
      continue;
    }

    // Colon / comma / braces / brackets
    if ("{}[]:,".includes(line[i])) {
      segments.push({ text: line[i], color: "#6b7280" });
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i]) || (line[i] === "-" && /\d/.test(line[i + 1] || ""))) {
      let num = "";
      while (i < line.length && /[\d.eE+\-]/.test(line[i])) num += line[i++];
      segments.push({ text: num, color: "#fb923c" });
      continue;
    }

    // Booleans / null
    if (line.slice(i).startsWith("true") || line.slice(i).startsWith("false") || line.slice(i).startsWith("null")) {
      const kw = line.slice(i).match(/^(true|false|null)/)![0];
      segments.push({ text: kw, color: "#f472b6" });
      i += kw.length;
      continue;
    }

    // Fallback
    segments.push({ text: line[i], color: "#e5e7eb" });
    i++;
  }

  return segments;
}
