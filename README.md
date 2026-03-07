# AI Developer Support Agent

Developer support is one of the most resource-intensive functions in any organization — engineers spend an average of 30–60 minutes per support interaction manually searching documentation, cross-referencing error codes, and diagnosing configuration issues. This project addresses that bottleneck by building an AI-powered support agent that automates first-line developer support for Firebase, grounding every response in official documentation to ensure accuracy and reducing average resolution time from minutes to seconds.

The system uses Retrieval-Augmented Generation (RAG) over 1,070+ indexed documentation chunks and an agentic reasoning loop with 5 specialized tools orchestrated via Model Context Protocol (MCP), enabling the agent to autonomously search docs, diagnose errors, analyze security rules, and escalate unresolved issues — without human intervention.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini_2.5-Flash-4285F4?logo=google&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-1.0-blueviolet)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)

---

## Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Documentation Search** | Retrieves relevant guides, API references, and code examples across 8 Firebase products with 80%+ retrieval relevance |
| **Error Diagnosis** | Looks up error codes against a structured database of 30+ known errors with curated resolution steps and code fixes |
| **Security Rules Analysis** | Parses Firestore/RTDB rules and flags anti-patterns — open access, missing auth checks, unvalidated writes |
| **Service Status** | Queries Firebase's live status endpoint to rule out platform-wide outages |
| **Bug Reporting** | Generates structured reports with reproduction steps when issues can't be resolved |

The agent decides which tools to use and in what order — it can chain multiple tool calls in a single conversation turn (up to 5 iterations) before responding.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React UI   │────▶│  Express Server   │────▶│   Agent Service     │
│  (Frontend) │◀────│  (API + MongoDB)  │◀────│   (MCP Client)      │
└─────────────┘     └──────────────────┘     └────────┬────────────┘
                                                       │
                                              ┌────────▼────────────┐
                                              │    MCP Server        │
                                              │    (Tool Registry)   │
                                              └────────┬────────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────┐
                          │              │             │          │         │
                   ┌──────▼──┐   ┌──────▼──┐   ┌─────▼───┐ ┌───▼───┐ ┌──▼────┐
                   │ search  │   │ lookup  │   │ analyze │ │ check │ │create │
                   │  _docs  │   │ _error  │   │ _rules  │ │_status│ │_bug   │
                   └────┬────┘   └────┬────┘   └─────────┘ └───────┘ └───────┘
                        │             │
                  ┌─────▼─────┐ ┌─────▼──────┐
                  │ Pinecone  │ │ Error Code │
                  │ (Vectors) │ │ Database   │
                  └───────────┘ └────────────┘
```

**Key design decision**: Tools are exposed via [Model Context Protocol (MCP)](https://modelcontextprotocol.io), decoupling them from the LLM. The agent loop translates MCP tool schemas into Gemini function declarations at runtime. Swapping the LLM provider requires changing only the agent service — tools remain untouched.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript |
| Backend | Node.js, Express |
| LLM | Google Gemini 2.0 Flash |
| Embeddings | Gemini Embedding 001 (768d) |
| Vector DB | Pinecone (serverless) |
| Database | MongoDB (sessions, messages, tickets) |
| Tool Protocol | Model Context Protocol (MCP) |
| Containerization | Docker |
| Deployment | Google Cloud Platform |

---

## RAG Pipeline

The ingestion pipeline converts Firebase documentation into searchable vectors:

```
firebase.google.com/docs → Scraper (Cheerio) → 35 doc pages
    → Chunker (section-based, code-aware) → 1,070 chunks
    → Gemini Embedding API (768d vectors)
    → Pinecone (cosine similarity search)
```

**Chunking strategy:**
- Split by section headings for topical coherence
- Code blocks kept intact (never split mid-code)
- 200-char overlap between chunks for context continuity
- Multi-language code tabs filtered to JavaScript/Node.js only
- Metadata preserved: product, topic, section, source URL

**Coverage:** Auth, Firestore, Realtime Database, Cloud Functions, Hosting, Storage, Cloud Messaging, Firebase CLI

---

## Agent Loop

The agent runs a multi-step reasoning loop (max 5 iterations):

```
Developer question
    → Gemini receives: system prompt + tool definitions + conversation history
    → Gemini decides: respond directly OR call a tool
    → If tool call: route through MCP → execute → return result to Gemini
    → Gemini decides again: respond OR call another tool
    → ... (up to 5 iterations)
    → Final grounded response returned to developer
```

**Example flow:**

> Developer: "I'm getting permission-denied when writing to Firestore"

1. Agent calls `lookup_error_code("permission-denied")` → gets structured cause + fix
2. Agent calls `search_docs("Firestore security rules write permission")` → gets relevant rule examples
3. Agent responds with: diagnosis, rule fix, code example, and doc link

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_docs` | Vector search over Firebase docs. Accepts query + optional product filter. Returns top-k chunks with relevance scores. |
| `lookup_error_code` | Three-tier lookup: exact match → fuzzy match → vector search fallback. Covers 30+ Firebase errors with curated resolutions. |
| `check_firebase_status` | Fetches live incident data from status.firebase.google.com. |
| `analyze_security_rules` | Static analysis of Firestore/RTDB rules for anti-patterns (open access, missing auth, no validation). |
| `create_bug_report` | Generates structured bug reports with repro steps, expected/actual behavior, and environment info. |



## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Pinecone account (free tier)
- Google AI Studio API key (free tier)

### Setup

```bash
# Clone
git clone https://github.com/ananya-mh/ai-support-chatbot.git
cd ai-support-chatbot

# Backend
cd backend
npm install
cp .env.example .env
# Fill in: GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, MONGO_URI

# Run ingestion pipeline (one-time)
node src/ingestion/pipeline.js scrape
node src/ingestion/pipeline.js chunk
node src/ingestion/pipeline.js upsert

# Start backend
node src/index.js

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### Environment Variables

```
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=firebase-docs
MONGO_URI=mongodb://localhost:27017/chatbot
PORT=5000
```

---