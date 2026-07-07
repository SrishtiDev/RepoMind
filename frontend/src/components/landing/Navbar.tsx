"use client";

/**
 * Navbar — fixed top bar with backdrop-blur. Left: RepoMind wordmark.
 * Right: GitHub icon link + "Get Started" button that triggers the shared modal.
 * Accepts an onGetStarted callback so the parent controls modal state.
 */

// Inline GitHub mark SVG — lucide-react v1.x doesn't export Github
const GithubIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
  </svg>
);

interface NavbarProps {
  onGetStarted: () => void;
}

export default function Navbar({ onGetStarted }: NavbarProps) {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-4 lg:px-12"
      style={{
        background: "rgba(10,10,15,0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Wordmark */}
      <a
        href="/"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
        aria-label="RepoMind home"
      >
        {/* Small brand accent dot */}
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: "linear-gradient(135deg, #6d5ce8, #8b7cf8)" }}
        />
        RepoMind
      </a>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* GitHub link */}
        <a
          href="https://github.com/srishti-rawat"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
          aria-label="View on GitHub"
        >
          <GithubIcon size={18} />
          <span className="hidden sm:inline">GitHub</span>
        </a>

        {/* Get Started CTA */}
        <button
          onClick={onGetStarted}
          className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-100"
          style={{
            background: "linear-gradient(135deg, #6d5ce8 0%, #8b7cf8 100%)",
            boxShadow: "0 0 0 0 rgba(109,92,232,0)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 20px rgba(109,92,232,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 0 0 rgba(109,92,232,0)";
          }}
          id="navbar-get-started"
        >
          Get Started
        </button>
      </div>
    </header>
  );
}
