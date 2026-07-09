// All API calls go through this module. The base URL resolves to the backend
// server in development (which runs on port 3000) and should
// be set via NEXT_PUBLIC_API_BASE in production.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

// ─── Request / Response types ────────────────────────────────────────────────

export interface IngestRequest {
  repoUrl: string;
}

export interface IngestResponse {
  success: boolean;
  message: string;
  jobId: string;
  repoUrl: string;
}

export interface AskRequest {
  question: string;
}

export interface Source {
  filename: string;
  filepath: string;
  chunkIndex: number;
}

export interface AskResponse {
  success: boolean;
  answer: string;
  sources: Source[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function post<TReq, TRes>(endpoint: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Parse JSON regardless of status so we can surface the server's error message.
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  return data as TRes;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function ingestRepo(repoUrl: string): Promise<IngestResponse> {
  return post<IngestRequest, IngestResponse>('/ingest', { repoUrl });
}

export function askQuestion(question: string): Promise<AskResponse> {
  return post<AskRequest, AskResponse>('/query', { question });
}

export async function fetchGraph(repoUrl: string): Promise<{ nodes: any[]; edges: any[] }> {
  const res = await fetch(`${BASE}/graph?repoUrl=${encodeURIComponent(repoUrl)}`);
  
  if (res.status === 404) {
    throw new Error("Code map isn't ready yet for this repo.");
  }
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  
  return data;
}

export async function fetchNodeSnippet(
  repoUrl: string,
  filepath: string,
  startLine?: number,
  endLine?: number,
): Promise<{ snippet: string; startLine: number; endLine: number }> {
  const params = new URLSearchParams({ repoUrl, filepath });
  if (startLine !== undefined) params.set("startLine", String(startLine));
  if (endLine !== undefined) params.set("endLine", String(endLine));

  const res = await fetch(`${BASE}/graph/node-snippet?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Snippet fetch failed: ${res.status}`);
  }

  return data;
}
