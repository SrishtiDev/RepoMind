import { useState, type FormEvent } from 'react';
import { ingestRepo } from '../lib/api';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; jobId: string }
  | { kind: 'error'; message: string };

export default function RepoInput() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus({ kind: 'loading' });
    try {
      const res = await ingestRepo(trimmed);
      setStatus({ kind: 'success', jobId: res.jobId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({ kind: 'error', message });
    }
  }

  const isLoading = status.kind === 'loading';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Ingest Repository
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          disabled={isLoading}
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Ingesting…' : 'Ingest Repo'}
        </button>
      </form>

      {/* Status messages */}
      {status.kind === 'success' && (
        <p className="mt-2 text-sm text-green-700">
          ✓ Ingestion started (job <code className="font-mono">{status.jobId}</code>).{' '}
          Processing in background — this may take a minute.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="mt-2 text-sm text-red-600">✗ {status.message}</p>
      )}
    </div>
  );
}
