"use client";

import { useEffect, useRef, useState } from "react";

function useScrollFade(threshold = 0.15) {
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

export default function MeaningSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollFade();
  const { ref: gridRef, isVisible: gridVisible } = useScrollFade(0.1);

  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
      <div 
        ref={headerRef}
        className={`flex flex-col items-center text-center transition-all duration-[600ms] ease-out ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
          Most code tools map your syntax.<br />
          <span style={{ color: "#a78bfa" }}>We map your business intent.</span>
        </h2>
        <p className="max-w-2xl text-base text-gray-400 sm:text-lg leading-relaxed">
          RepoMind goes beyond simple file references and raw vector similarity. We parse your entire codebase to extract semantic groups—like authentication, payments, and data access—so you can trace real architectural purpose.
        </p>
      </div>

      <div 
        ref={gridRef}
        className={`mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 transition-all duration-[600ms] delay-150 ease-out ${
          gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* LEFT CARD - Typical Vector Search */}
        <div 
          className="flex flex-col rounded-2xl p-8 transition-colors"
          style={{ 
            background: "rgba(255,255,255,0.02)", 
            border: "1px solid rgba(255,255,255,0.05)" 
          }}
        >
          <div className="mb-8 text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Typical Vector Search
          </div>
          
          <div className="flex-1 flex items-center justify-center py-8">
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-30">
              {/* Nodes */}
              <circle cx="50" cy="50" r="4.5" fill="#6b7280" />
              <circle cx="90" cy="30" r="5.5" fill="#6b7280" />
              <circle cx="150" cy="60" r="4.5" fill="#6b7280" />
              <circle cx="40" cy="120" r="6.5" fill="#6b7280" />
              <circle cx="100" cy="140" r="4.5" fill="#6b7280" />
              <circle cx="160" cy="150" r="5.5" fill="#6b7280" />
              <circle cx="130" cy="100" r="4.5" fill="#6b7280" />
              <circle cx="70" cy="80" r="3.5" fill="#6b7280" />
              <circle cx="110" cy="70" r="4.5" fill="#6b7280" />
              
              {/* Edges */}
              <path d="M50 50L90 30" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M90 30L110 70" stroke="#4b5563" strokeWidth="1" />
              <path d="M110 70L150 60" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M50 50L70 80" stroke="#4b5563" strokeWidth="1" />
              <path d="M70 80L40 120" stroke="#4b5563" strokeWidth="1" />
              <path d="M70 80L130 100" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M130 100L160 150" stroke="#4b5563" strokeWidth="1" />
              <path d="M130 100L100 140" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M40 120L100 140" stroke="#4b5563" strokeWidth="1" />
            </svg>
          </div>

          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            Chunks and similarity scores. No sense of what connects to what, leaving you guessing about true architectural impact.
          </p>
        </div>

        {/* RIGHT CARD - RepoMind */}
        <div 
          className="flex flex-col rounded-2xl p-8 relative overflow-hidden"
          style={{ 
            background: "rgba(255,255,255,0.03)", 
            border: "1px solid rgba(109,92,232,0.3)",
            boxShadow: "0 8px 32px rgba(109,92,232,0.08)",
          }}
        >
          {/* Subtle glow effect */}
          <div 
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ 
              background: "radial-gradient(circle, rgba(109,92,232,0.15) 0%, transparent 70%)",
              filter: "blur(40px)",
            }} 
          />

          <div className="mb-8 text-sm font-semibold tracking-wide uppercase" style={{ color: "#a78bfa" }}>
            RepoMind
          </div>

          <div className="flex-1 flex flex-col gap-5 py-4 relative z-10">
            {/* Tag Group 1 */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-gray-400">Authentication</span>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>verifyToken()</span>
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>loginHandler()</span>
              </div>
            </div>

            {/* Tag Group 2 */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-gray-400">Data Layer</span>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>queryUser()</span>
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>connectDb()</span>
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>migrate()</span>
              </div>
            </div>

            {/* Tag Group 3 */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-gray-400">API Routes</span>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>/api/v1/auth</span>
                <span className="rounded-md px-2.5 py-1 text-xs font-mono text-gray-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>/api/v1/users</span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-gray-300 leading-relaxed relative z-10">
            Grouped by what the code actually does — traceable through real call and import relationships, directly mapped to your logic.
          </p>
        </div>
      </div>
    </section>
  );
}
