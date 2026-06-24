# RepoMind

**Ask questions about any GitHub repository. Get answers with source citations.**

Paste a GitHub URL. Ask "How does auth work?" or "Where is rate limiting implemented?" — RepoMind's agent traces through the actual code, reasons across files, and responds with file paths and line numbers.

Live at → `repomind.dev` *(coming soon)*

---

## The Problem

You land on an unfamiliar codebase. There's no doc, or the doc is stale. Reading through it manually takes hours. Grep doesn't understand context. ChatGPT hallucinates file structures that don't exist.

Developers need a way to *query* code the way they query databases.

---

## What RepoMind Does

- Paste any public GitHub repo URL
- RepoMind clones it, parses it with an AST-aware chunker (no mid-function cuts), and embeds it into a vector store
- A LangGraph agent receives your question, retrieves relevant chunks, decides if it has enough context, retrieves more if needed, then answers
- Every answer includes **file path + line number citations** — no hallucinated references

---

## Architecture

```
User Query
    │
    ▼
LangGraph Agent
    │
    ├── Retrieve Node → ChromaDB vector search
    │       │
    │       └── Assess: enough context? ──No──► Re-retrieve with refined query
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
git clone (temp dir)
    │
    ▼
AST-aware chunker (tree-sitter)
  - Splits at function/class boundaries
  - Preserves import context per chunk
  - Attaches metadata: file path, start line, end line
    │
    ▼
OpenAI embeddings → ChromaDB
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent | LangGraph.js |
| RAG | LangChain.js + ChromaDB |
| Code Parsing | tree-sitter (AST-aware chunking) |
| Backend | Node.js + Express |
| Frontend | React (Vite) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Deployment | Railway (backend) + Vercel (frontend) |

---

## Why AST-Aware Chunking

Naive text splitters cut at token count — which means a function gets split mid-body, imports get separated from the code that uses them, and retrieval returns useless fragments.

RepoMind uses tree-sitter to parse each file into its syntax tree and chunks at natural code boundaries: function declarations, class definitions, module exports. Each chunk stays semantically complete.

This is the core technical decision that makes retrieval actually work on real codebases.

---

## Why LangGraph (not a simple chain)

A single retrieve → answer chain fails when the question requires multi-file context.

Example: "How does the auth middleware connect to the route handler?" — the answer lives in two files, and a single retrieval pass may only surface one.

LangGraph lets the agent assess retrieved context, decide it's incomplete, reformulate the query, and retrieve again — before committing to an answer. This is a conditional graph, not a linear chain.

---

## Project Structure

```
repomind/
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── graph.ts          # LangGraph graph definition
│   │   │   ├── nodes/
│   │   │   │   ├── retrieve.ts   # Vector search node
│   │   │   │   ├── assess.ts     # Context sufficiency check
│   │   │   │   └── answer.ts     # Final answer generation
│   │   ├── ingestion/
│   │   │   ├── clone.ts          # GitHub repo cloning
│   │   │   ├── chunker.ts        # AST-aware chunker (tree-sitter)
│   │   │   └── embed.ts          # Embedding + ChromaDB insert
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
git clone https://github.com/yourusername/repomind
cd repomind

# Backend
cd backend
cp .env.example .env        # Add OPENAI_API_KEY
npm install
npm run dev                 # Runs on :3001

# Frontend
cd ../frontend
npm install
npm run dev                 # Runs on :5173
```

**Environment variables:**
```
OPENAI_API_KEY=
CHROMA_HOST=localhost
CHROMA_PORT=8000
PORT=3001
```

---

## What's Non-Trivial Here

If you're reading this as a technical reviewer:

- The **AST chunker** handles 8 file types (JS, TS, Python, Java, Go, Rust, C, C++) with language-specific tree-sitter grammars
- The **LangGraph graph** has a conditional edge: the assess node returns `"sufficient"` or `"insufficient"` — the graph loops on insufficient up to 3 times before forcing an answer
- Repos up to **~50MB** are supported via streaming clone + chunk-on-the-fly (no full load into memory)
- Each chunk stores **metadata**: file path, start/end line, language, parent scope name — used to generate citations, not reconstructed from the answer

---

## Roadmap

- [ ] Support private repos via GitHub OAuth
- [ ] Persistent repo index (skip re-ingestion on revisit)
- [ ] PR diff mode — "what changed in this PR and why"
- [ ] Multi-repo comparison

---

## Author

**Srishti Rawat**
[GitHub](https://github.com/yourusername) · [LinkedIn](https://linkedin.com/in/yourprofile)

Pre-final year CS student @ ABES Engineering College, Ghaziabad.
Building in public. Open to SDE internship opportunities (2026).
