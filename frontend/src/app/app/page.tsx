"use client";
import { useState } from 'react';
import RepoInput from '../../components/app/RepoInput';
import ChatWindow from '../../components/app/ChatWindow';
import { CodeMapTab } from '../../components/codemap/CodeMapTab';

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "map">("chat");
  const [mapRepoUrl, setMapRepoUrl] = useState<string>("");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">RepoMind</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ingest a GitHub repository, then ask questions about its code.
            </p>
          </div>
          <div className="flex gap-2 bg-slate-200 p-1 rounded-lg">
            <button 
               onClick={() => setActiveTab("chat")}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "chat" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
               Q&A Chat
            </button>
            <button 
               onClick={() => setActiveTab("map")}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "map" ? "bg-[#d4a24c] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
               Code Map
            </button>
          </div>
        </header>

        {activeTab === "chat" && (
           <div className="space-y-6">
             <RepoInput />
             <ChatWindow />
           </div>
        )}

        {activeTab === "map" && (
           <div className="space-y-4">
             <div className="flex gap-2 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
               <span className="text-sm font-medium text-slate-700 uppercase tracking-wide min-w-max">Target Repo</span>
               <input 
                 type="url"
                 value={mapRepoUrl}
                 onChange={(e) => setMapRepoUrl(e.target.value)}
                 placeholder="https://github.com/owner/repo"
                 className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[#d4a24c] focus:ring-1 focus:ring-[#d4a24c]"
               />
             </div>
             
             {mapRepoUrl.trim() ? (
               <CodeMapTab repoUrl={mapRepoUrl.trim()} />
             ) : (
               <div className="h-[500px] w-full rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400">
                 <div className="text-4xl mb-4 opacity-50">🧭</div>
                 <p>Enter a repository URL above to load its visual map.</p>
               </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
}
