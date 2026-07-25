"use client";

import { ChevronRight, Home } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavLevel {
  level: "overview" | "module";
  moduleId?: string;
  label?: string;
}

interface Props {
  navStack: NavLevel[];
  onNavigate: (index: number) => void;
}

// ─── BreadcrumbNav ────────────────────────────────────────────────────────────

/**
 * BreadcrumbNav — A slim breadcrumb bar that appears above the graph when the
 * user has drilled into a module. Each crumb is clickable and navigates back
 * to that level in the stack.
 *
 * Renders nothing when only the Overview level is active.
 *
 * Style: glassmorphism, consistent with CodeMapTab's dark theme.
 */
export function BreadcrumbNav({ navStack, onNavigate }: Props) {
  // Hide when there's only the overview level
  if (navStack.length <= 1) return null;

  return (
    <div
      className="absolute top-16 left-4 z-20 flex items-center gap-1 animate-in"
      style={{
        animation: "slideDown 0.2s ease-out",
      }}
    >
      <div
        className="flex items-center gap-1 bg-[#0d0a08]/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 shadow-lg text-xs"
        style={{ maxWidth: "calc(100vw - 2rem)" }}
      >
        {navStack.map((crumb, index) => {
          const isLast = index === navStack.length - 1;
          const isClickable = !isLast;

          return (
            <span key={index} className="flex items-center gap-1">
              {/* Separator (not before the first crumb) */}
              {index > 0 && (
                <ChevronRight className="w-3 h-3 text-white/25 shrink-0" />
              )}

              <button
                onClick={() => isClickable && onNavigate(index)}
                disabled={!isClickable}
                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-all font-medium
                  ${
                    isLast
                      ? "text-[#d4a24c] cursor-default"
                      : "text-white/50 hover:text-white/90 hover:bg-white/10 cursor-pointer"
                  }`}
              >
                {index === 0 && <Home className="w-3 h-3 shrink-0" />}
                <span className="whitespace-nowrap">
                  {crumb.level === "overview" ? "Overview" : crumb.label}
                </span>
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
