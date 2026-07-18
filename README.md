# RepoMind

**Ask questions about any GitHub repository. Get answers with source citations.**

Paste a GitHub URL. Ask "How does auth work?" or "Where is rate limiting implemented?" — RepoMind's agent retrieves relevant code chunks, checks if it has enough context, retrieves again if not, and answers with the file and chunk it used.

---

## The Problem

You land on an unfamiliar codebase. There's no doc, or the doc is stale. Reading through it manually takes hours. Grep doesn't understand context. ChatGPT hallucinates file structures that don't exist.

Developers need a way to *query* code the way they query databases.

---

## What RepoMind Does

- **Intelligent Ingestion**: Paste any public GitHub repo URL to securely clone, chunk, and embed code into a Qdrant vector store (with strict multi-tenant isolation). It also parses AST dependencies to build a structural graph.
- **Multi-Path Retrieval Agent**: A LangGraph workflow processes questions using parallel vector similarity search and semantic tag-based graph retrieval. The contexts are merged and assessed automatically.
- **Self-Refining Context**: If the LLM judges retrieved chunks insufficient, it refines the query and loops back to fetch more context (up to 2 retries) before generating an answer.
- **Accurate Citations**: Every answer includes exact file name and chunk citations grounded in retrieved context, preventing hallucination.
- **Visual Code Map**: Switch to an interactive 2D node graph to explore the architecture, revealing business logic and structural layers with guided tours.

---

## Architecture

```text
User Query
    │
    ▼
LangGraph Agent (Parallel Fan-out)
    │
    ├── Vector Retrieve Node → Qdrant similarity search
    └── Classify Tags Node   → Match business logic tags
            │
            ▼
     Graph Retrieve Node     → Structural context (AST dependencies)
            │
            ▼
      Merge Context Node     → Combine vector + graph results
            │
            ▼
       Assess Node           → Enough context? ──No──► Refine query, re-retrieve (max 2 retries)
            │
           Yes
            │
            ▼
       Answer Node           → Final Response + File/Chunk Citations
```

**Ingestion Pipeline:**

```
GitHub URL
    │
    ▼
POST /ingest → job queued (BullMQ + Redis)
    │
    ▼
Worker: git clone (simple-git, temp dir)
    │
    ▼
Chunk files (~1000 chars, 200 char overlap)
  - Attaches metadata: filename, filepath, chunkIndex
    │
    ▼
Gemini embeddings → Qdrant
```

Ingestion runs as a background job, not inline in the HTTP request — cloning and embedding a repo can take well over a request's reasonable timeout, so the API just queues the job and returns immediately.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent | LangGraph.js |
| RAG | LangChain.js |
| Vector Store | Qdrant |
| Job Queue | BullMQ + Redis |
| Backend | Node.js + Express |
| Frontend | React (Vite) + Tailwind CSS + React Flow + Dagre |
| Embeddings + LLM | Google Gemini |

---

## Why LangGraph (not a simple chain)

A single retrieve → answer chain fails when the first retrieval pass doesn't surface enough context.

RepoMind's agent assesses the retrieved chunks against the question, and if the LLM judges the context insufficient, it generates a refined query and retrieves again — up to 2 retries — before committing to an answer. This is a conditional graph with a loop, not a linear chain.

---

## Project Structure

```text
repomind/
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── graph.ts          # LangGraph StateGraph definition
│   │   │   ├── state.ts          # Graph state type
│   │   │   └── nodes/            # Retrieve, classifyTags, graphRetrieve, mergeContext, assess, answer
│   │   ├── ingestion/            # Repo cloning, chunking, and embedding logic
│   │   ├── queue/                # BullMQ producer and worker for async jobs
│   │   ├── routes/               # Express endpoints (POST /ingest, POST /query, GET /graph)
│   │   ├── semantic/             # Semantic classification and resilience logic
│   │   └── structural/           # Graph builder (React Flow & Dagre exports)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── app/              # Main chat UI (RepoInput, ChatWindow, CitationCard)
│   │   │   ├── codemap/          # Visual Code Map exploration (GraphView, GuidedTour)
│   │   │   └── landing/          # Landing page sections
│   │   └── App.tsx
├── repomind-mcp/                 # Model Context Protocol bridge server
└── README.md
```

---

## Running Locally

```bash
# Clone
git clone https://github.com/SrishtiDev/RepoMind
cd RepoMind

# Start Qdrant + Redis
cd backend
docker-compose up -d

# Backend
cp .env.example .env        # Add GOOGLE_API_KEY
npm install
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

**Environment variables:**
```
GOOGLE_API_KEY=
QDRANT_URL=http://localhost:6333
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

---

## Current Limitations (being worked on)

- Chunking is character-based, not AST-aware — a function can currently be split mid-body. Moving to tree-sitter-based chunking is the next major improvement.
- Citations reference filename + chunk index, not exact line numbers.
- Only public repos are supported (no GitHub OAuth for private repos).
- No persistent job status polling on the frontend yet — ingestion status isn't live-tracked.

Being upfront about these because they're the honest state of the project, and they're also the most interesting things to talk about in an interview — they're deliberate engineering tradeoffs, not oversights.

---

## Roadmap

- [ ] AST-aware chunking via tree-sitter (function/class-boundary chunks, line-number citations)
- [ ] Job status polling on frontend
- [ ] Support private repos via GitHub OAuth
- [ ] Persistent repo index (skip re-ingestion on revisit)
- [ ] PR diff mode — "what changed in this PR and why"

---

## MCP Server Integration

RepoMind includes an MCP (Model Context Protocol) server to allow AI agents like Claude Code, Cursor, or Zed to directly ingest and query GitHub repositories locally.

### Setup

```bash
cd repomind-mcp
npm install
npm run build
```

### IDE Config Snippets

#### Claude Code (`~/.claude/mcp.json` or project-level `.mcp.json`)
```json
{
  "mcpServers": {
    "repomind": {
      "command": "node",
      "args": ["/home/srishti-rawat/Projects/RepoMind/repomind-mcp/dist/index.js"],
      "env": {
        "REPOMIND_API_URL": "repo-mind-brown.vercel.app"
      }
    }
  }
}
```

#### Cursor (`~/.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "repomind": {
      "command": "node",
      "args": ["/home/srishti-rawat/Projects/RepoMind/repomind-mcp/dist/index.js"],
      "env": {
        "REPOMIND_API_URL": "repo-mind-brown.vercel.app"
      }
    }
  }
}
```

#### Zed (`.zed/settings.json` -> `context_servers` key)
```json
{
  "context_servers": {
    "repomind": {
      "command": {
        "path": "node",
        "args": ["/home/srishti-rawat/Projects/RepoMind/repomind-mcp/dist/index.js"],
        "env": {
          "REPOMIND_API_URL": "repo-mind-brown.vercel.app"
        }
      }
    }
  }
}
```

### Available MCP Tools
- **`repomind_ingest`**: Ingest a public GitHub repository. Call this once before querying.
- **`repomind_ask`**: Ask a question about an ingested repository. Returns answers with file/chunk citations.

---

## Author

**Srishti Rawat**
[GitHub](https://github.com/SrishtiDev) · [X](https://x.com/srishtirwt)
