"use client";
import { useState } from 'react';
import RepoInput from '../../components/app/RepoInput';
import ChatWindow from '../../components/app/ChatWindow';
import { CodeMapTab } from '../../components/codemap/CodeMapTab';

export default function AppPage() {
  const [activeRepoUrl, setActiveRepoUrl] = useState<string>("");

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0d0d10] overflow-hidden">
      {/* Left Panel - Q&A (40%) */}
      <div className="w-full lg:w-[40%] h-full flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 bg-[#16161a] overflow-y-auto">
        <div className="p-6 space-y-6 flex-1 flex flex-col">
          <header>
            <h1 className="text-2xl font-bold text-white">RepoMind</h1>
            <p className="mt-1 text-sm text-gray-400">
              Ingest a GitHub repository, then ask questions about its code.
            </p>
          </header>

          <div className="shrink-0">
            <RepoInput onIngestStart={(url) => setActiveRepoUrl(url)} />
          </div>
          
          <div className="flex-1 min-h-[400px]">
            <ChatWindow />
          </div>
        </div>
      </div>

      {/* Right Panel - Code Map (60%) */}
      <div className="w-full lg:w-[60%] h-full bg-[#16161a] overflow-y-auto flex flex-col p-6 space-y-4">
        <div className="flex justify-between items-center bg-[#0d0d10] p-3 rounded-lg border border-white/10 shadow-sm shrink-0">
          <div className="flex gap-3 items-center">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">Target Repo</span>
            {activeRepoUrl ? (
              <span className="text-sm font-mono text-white bg-white/5 px-2 py-1 rounded border border-white/10">
                {activeRepoUrl}
              </span>
            ) : (
              <span className="text-sm italic text-gray-500">None selected</span>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col min-h-[500px]">
          {activeRepoUrl ? (
            <CodeMapTab repoUrl={activeRepoUrl} />
          ) : (
            <div className="h-full w-full rounded-xl border border-white/10 bg-[#0d0d10] flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-4 opacity-50">🧭</div>
              <p>Ingest a repository on the left to load its visual map.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
