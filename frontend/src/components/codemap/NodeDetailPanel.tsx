import { X } from "lucide-react";

export interface NodeData {
  label: string;
  filepath: string;
  type: string;
  tags: string[];
  startLine?: number;
  endLine?: number;
}

interface Props {
  nodeData: NodeData | null;
  onClose: () => void;
}

/**
 * NodeDetailPanel.tsx - Slide-in side panel showing detailed metadata for a selected graph node.
 */
export function NodeDetailPanel({ nodeData, onClose }: Props) {
  if (!nodeData) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-[#0d0a08]/90 backdrop-blur-md border-l border-white/10 p-6 shadow-2xl flex flex-col z-20 transition-transform duration-300">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-[#d4a24c] font-semibold text-lg max-w-[200px] break-words">{nodeData.label}</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <p className="text-white/40 uppercase text-xs font-bold mb-1">Type</p>
          <p className="text-white/90 capitalize">{nodeData.type}</p>
        </div>

        <div>
          <p className="text-white/40 uppercase text-xs font-bold mb-1">File Path</p>
          <p className="text-white/90 break-all">{nodeData.filepath}</p>
        </div>
        
        {(nodeData.startLine !== undefined && nodeData.endLine !== undefined) && (
          <div>
             <p className="text-white/40 uppercase text-xs font-bold mb-1">Lines</p>
             <p className="text-white/90">{nodeData.startLine} - {nodeData.endLine}</p>
          </div>
        )}

        <div>
          <p className="text-white/40 uppercase text-xs font-bold mb-2">Business Tags</p>
          {nodeData.tags && nodeData.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nodeData.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-[#d4a24c]/20 text-[#d4a24c] rounded text-xs border border-[#d4a24c]/30">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/40 italic">No semantic tags.</p>
          )}
        </div>
      </div>
    </div>
  );
}
