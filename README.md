# RepoMind

**Ask questions about any GitHub repository. Get answers with source citations.**

Paste a GitHub URL. Ask "How does auth work?" or "Where is rate limiting implemented?" — RepoMind's agent retrieves relevant code chunks, checks if it has enough context, retrieves again if not, and answers with the file and chunk it used.

---

## The Problem

You land on an unfamiliar codebase. There's no doc, or the doc is stale. Reading through it manually takes hours. Grep doesn't understand context. ChatGPT hallucinates file structures that don't exist.

Developers need a way to *query* code the way they query databases.

---

## What RepoMind Does

- Paste any public GitHub repo URL
- RepoMind clones it, chunks the code, and embeds it into a vector store (Qdrant)
- A LangGraph agent receives your question, retrieves relevant chunks, assesses whether the context is sufficient, retrieves again with a refined query if not, then answers
- Every answer includes **file name + chunk citations** — grounded in what was actually retrieved, not hallucinated

---

## Architecture

```
User Query
    │
    ▼
LangGraph Agent
    │
    ├── Retrieve Node → Qdrant vector search
    │       │
    │       └── Assess: enough context? ──No──► Refine query, re-retrieve (max 2 retries)
    │                       │
    │                      Yes
    │                       │
    ▼                       ▼
    └──────────── Answer Node → Response + Citations
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
| Frontend | React (Vite) + Tailwind |
| Embeddings + LLM | Google Gemini |

---

## Why LangGraph (not a simple chain)

A single retrieve → answer chain fails when the first retrieval pass doesn't surface enough context.

RepoMind's agent assesses the retrieved chunks against the question, and if the LLM judges the context insufficient, it generates a refined query and retrieves again — up to 2 retries — before committing to an answer. This is a conditional graph with a loop, not a linear chain.

---

## Project Structure

```
repomind/
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── graph.ts          # LangGraph StateGraph definition
│   │   │   ├── state.ts          # Graph state type
│   │   │   ├── nodes/
│   │   │   │   ├── retrieve.ts   # Vector search node
│   │   │   │   ├── assess.ts     # Context sufficiency check + query refinement
│   │   │   │   └── answer.ts     # Final answer generation with citations
│   │   ├── ingestion/
│   │   │   ├── clone.ts          # GitHub repo cloning (simple-git)
│   │   │   ├── chunker.ts        # Chunking logic
│   │   │   └── embed.ts          # Embedding + Qdrant insert
│   │   ├── queue/
│   │   │   ├── producer.ts       # Adds ingestion job to BullMQ
│   │   │   └── worker.ts         # Processes ingestion jobs
│   │   └── routes/
│   │       ├── ingest.ts         # POST /ingest
│   │       └── query.ts          # POST /query
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RepoInput.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   └── CitationCard.tsx
│   │   └── App.tsx
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

## Author

**Srishti Rawat**
[GitHub](https://github.com/SrishtiDev) · [X](https://x.com/srishtirwt)
