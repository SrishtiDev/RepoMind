import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface Props {
  tagsInGraph: string[];
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  onClose: () => void;
}

export const TAG_DESCRIPTIONS: Record<string, string> = {
  "auth": "Authentication, authorization, session/token handling",
  "payment": "Payment processing, billing, transactions",
  "data-layer": "Database queries, ORM models, data access",
  "api-route": "HTTP route handlers, controllers",
  "validation": "Input validation, schema checking",
  "error-handling": "Error handling, logging, exception management",
  "config": "Configuration, environment setup, constants",
  "util": "Generic helper/utility functions",
  "test": "Test files, test helpers, mocks",
  "ui-component": "Frontend UI components",
  "external-integration": "Third-party API/service integration",
  "business-logic": "Core domain logic",
  "other": "Miscellaneous logic"
};

/**
 * GuidedTour.tsx - Step-through overlay highlighting one tag-group at a time.
 */
export function GuidedTour({ tagsInGraph, activeTag, setActiveTag, onClose }: Props) {
  if (tagsInGraph.length === 0) return null;
  
  const currentTag = activeTag || tagsInGraph[0];
  const currentIndex = tagsInGraph.indexOf(currentTag);
  
  const handleNext = () => {
    if (currentIndex < tagsInGraph.length - 1) setActiveTag(tagsInGraph[currentIndex + 1]);
  };
  
  const handlePrev = () => {
    if (currentIndex > 0) setActiveTag(tagsInGraph[currentIndex - 1]);
  };

  const handleClose = () => {
    setActiveTag(null);
    onClose();
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-96 bg-[#0d0a08]/95 backdrop-blur-md border border-[#d4a24c]/40 rounded-xl p-5 shadow-[0_0_30px_rgba(212,162,76,0.15)] z-30">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[#d4a24c] font-medium flex items-center gap-2 capitalize">
          <span className="w-2 h-2 rounded-full bg-[#d4a24c] animate-pulse" />
          Exploring: {currentTag}
        </h4>
        <button onClick={handleClose} className="text-white/50 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-white/70 text-sm mb-5 leading-relaxed min-h-[40px]">
        {TAG_DESCRIPTIONS[currentTag] || "Discover the architectural map of this codebase."}
      </p>
      
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs">{currentIndex + 1} of {tagsInGraph.length}</span>
        <div className="flex gap-2">
          <button 
            disabled={currentIndex <= 0} 
            onClick={handlePrev}
            className="p-1.5 rounded bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            disabled={currentIndex >= tagsInGraph.length - 1} 
            onClick={handleNext}
            className="p-1.5 rounded bg-[#d4a24c]/20 text-[#d4a24c] disabled:opacity-30 hover:bg-[#d4a24c]/30 transition-colors border border-[#d4a24c]/30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
