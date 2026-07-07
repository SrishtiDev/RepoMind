"use client";

/**
 * LandingPage — root "/" page component.
 * Composes Navbar, Hero (video bg), "Get started in 30 seconds" section,
 * and Footer. Modal state is lifted here so both the Navbar CTA and the
 * Hero "Get Started" button can trigger the same GetStartedModal.
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";

// Inline SVGs for icons not in this lucide-react version
const GithubIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
  </svg>
);

const StarIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);
import Navbar from "./Navbar";
import GetStartedModal from "./GetStartedModal";
import CodeBlock from "./CodeBlock";

const SETUP_COMMANDS = `# 1. Clone the repo and install dependencies
git clone https://github.com/srishti-rawat/RepoMind.git
cd RepoMind/repomind-mcp && npm install

# 2. Build the MCP server
npm run build

# 3. Add to your IDE's MCP config (e.g. ~/.cursor/mcp.json)
node dist/index.js`;

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "#ffffff" }}>
      {/* ── Shared modal ── */}
      <GetStartedModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── Fixed Navbar ── */}
      <Navbar onGetStarted={() => setModalOpen(true)} />

      {/* ══════════════════════════════════════
          PART 1 — Hero Section
      ══════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            background:
              "linear-gradient(180deg, rgba(10,10,15,0.82) 0%, rgba(10,10,15,0.55) 50%, rgba(10,10,15,0.88) 100%)",
          }}
        />

        {/* Subtle radial purple glow behind the headline */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            zIndex: 1,
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(109,92,232,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Hero content */}
        <div
          className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center"
          style={{ paddingTop: "96px" /* offset for fixed navbar */ }}
        >
          {/* Pill badge */}
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide"
            style={{
              background: "rgba(109,92,232,0.12)",
              border: "1px solid rgba(109,92,232,0.35)",
              color: "#a78bfa",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#6d5ce8", boxShadow: "0 0 6px #6d5ce8" }}
            />
            AI-powered code understanding · MCP-native
          </div>

          {/* Main headline */}
          <h1
            className="mb-5 font-extrabold leading-none tracking-tight text-white"
            style={{ fontSize: "clamp(64px, 10vw, 96px)", letterSpacing: "-0.03em" }}
          >
            RepoMind
          </h1>

          {/* Subheadline */}
          <p
            className="mb-10 max-w-2xl leading-relaxed"
            style={{
              fontSize: "clamp(17px, 2.2vw, 20px)",
              color: "#9ca3af",
              fontWeight: 400,
            }}
          >
            Ask any question about any GitHub repository and get precise,
            <br className="hidden sm:block" />
            cited answers — powered by a local RAG pipeline you control.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {/* Primary */}
            <button
              id="hero-get-started"
              onClick={() => setModalOpen(true)}
              className="group flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.04] active:scale-100"
              style={{
                background: "linear-gradient(135deg, #6d5ce8 0%, #8b7cf8 100%)",
                boxShadow: "0 4px 24px rgba(109,92,232,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 36px rgba(109,92,232,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 24px rgba(109,92,232,0.35)";
              }}
            >
              Get Started
              <ChevronRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </button>

            {/* Secondary */}
            <a
              href="/app"
              id="hero-live-demo"
              className="flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.04] active:scale-100"
              style={{
                color: "#d1d5db",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(255,255,255,0.10)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "rgba(255,255,255,0.24)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "rgba(255,255,255,0.14)";
              }}
            >
              Live Demo
            </a>
          </div>

          {/* Trust / meta row */}
          <div className="mt-8 flex items-center gap-1.5 text-xs text-gray-500">
            <GithubIcon size={13} />
            <a
              href="https://github.com/srishti-rawat/RepoMind"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gray-300"
            >
              View on GitHub
            </a>
            <span className="mx-1 opacity-40">·</span>
            <span className="text-yellow-500/70"><StarIcon size={12} /></span>
            <span>Open source</span>
          </div>
        </div>

        {/* Scroll-down fade at the very bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            zIndex: 2,
            background:
              "linear-gradient(to bottom, transparent, #0a0a0f)",
          }}
        />
      </section>

      {/* ══════════════════════════════════════
          PART 2 — "Get started in 30 seconds"
      ══════════════════════════════════════ */}
      <section
        id="setup"
        className="relative mx-auto max-w-3xl px-6 py-28"
      >
        {/* Section heading */}
        <h2
          className="mb-3 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          Get started in{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #6d5ce8, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            30 seconds
          </span>
        </h2>

        <p className="mb-10 text-center text-sm text-gray-500">
          A fully local MCP server — no cloud, no API keys required.
        </p>

        {/* Terminal code card */}
        <CodeBlock code={SETUP_COMMANDS} language="shell" />

        {/* Sub-note */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Works with Claude Code, Cursor, Windsurf, and other MCP-compatible tools.
        </p>
      </section>

      {/* ══════════════════════════════════════
          PART 3 — Footer
      ══════════════════════════════════════ */}
      <footer
        className="border-t px-6 py-10"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "linear-gradient(135deg, #6d5ce8, #8b7cf8)" }}
            />
            RepoMind
          </div>

          {/* Links */}
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <a
              href="https://github.com/srishti-rawat/RepoMind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-gray-300"
            >
              <GithubIcon size={14} />
              GitHub
            </a>
            <span className="opacity-30">·</span>
            <a
              href="/app"
              className="transition-colors hover:text-gray-300"
            >
              Live Demo
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} RepoMind. MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
