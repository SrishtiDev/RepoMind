import RepoInput from '../../components/app/RepoInput';
import ChatWindow from '../../components/app/ChatWindow';

export default function AppPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">RepoMind</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingest a GitHub repository, then ask questions about its code.
          </p>
        </header>

        {/* Step 1 — ingest */}
        <RepoInput />

        {/* Step 2 — chat */}
        <ChatWindow />
      </div>
    </div>
  );
}
