# Digital Twin MVP

An AI assistant that answers questions as me, grounded in my real data. Ask about my work history, skills, or live calendar schedule - it pulls from actual sources rather than a static bio.

Live demo: [https://digital-twin-api-production.up.railway.app/](https://digital-twin-api-production.up.railway.app/)

---

## What it does

The twin connects to two data sources:

- **LinkedIn profile data** - work experience, education, skills, projects, career goals. Structured as ~20 documents and embedded at startup.
- **Google Calendar** - live events fetched on each request. Default window is 14 days; expands to 60 days automatically when the query references a future date or month.

Queries are answered using a RAG pipeline: embed the query, retrieve the most relevant documents, inject them as context, generate a response in first person.

---

## Architecture

```
React frontend
     │
     │ POST /api/chat
     ▼
Express backend
     │
     ├── detectTimeWindow(query)      -- 14 or 60 day calendar fetch
     ├── retrieveRelevantData()       -- cosine similarity + keyword boost
     │        │
     │        ├── loadPersonalData()  -- static embeddings from disk
     │        └── fetchCalendarEvents() -- live Google Calendar API
     │
     └── generateResponse()           -- GPT-4o-mini with grounded context
```

---

## Project structure

```
digital-twin-mvp/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatInterface.jsx   -- message state, submission, chunked display
│       │   └── Message.jsx         -- avatar, markdown rendering, timestamps
│       └── services/
│           └── api.js              -- fetch wrapper for /api/chat
├── backend/
│   └── src/
│       ├── routes/
│       │   └── chat.js             -- POST /api/chat endpoint
│       ├── services/
│       │   ├── digitalTwin.js      -- query pipeline, time window detection, post-filtering
│       │   ├── retrieval.js        -- scoring, TOP_K selection, threshold logic
│       │   ├── dataLoader.js       -- cache management, embedding generation
│       │   ├── calendar.js         -- Google Calendar OAuth + event formatting
│       │   └── openai.js           -- embedding and completion wrappers
│       └── utils/
│           └── math.js             -- cosine similarity
├── data/
│   ├── personal_data.json          -- LinkedIn profile structured as embeddable docs
│   └── embeddings.json             -- pre-computed static embeddings (gitignored)
└── docs/
    └── DESIGN.md                   -- architecture decisions and tradeoffs
```

---

## Setup

### Prerequisites

- Node.js 18+
- A Google Cloud project with Calendar API enabled
- OAuth 2.0 credentials (`credentials.json`)

### Clone the repo

```bash
git clone https://github.com/varunshawarma/digital-twin-mvp.git
cd digital-twin-mvp
```

### Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### Environment variables

**backend/.env**
```
OPENAI_API_KEY=your_key_here
PORT=3001
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3001
```

### Google Calendar auth

The first time you run the app locally, generate an OAuth token:

```bash
cd backend
node src/auth/generateToken.js
```

This opens a browser, completes the OAuth flow, and saves `token.json` to the backend directory. The token refreshes automatically during normal use.

### Run locally

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173`.

---

## Evaluation

The eval suite runs 29 test cases across 5 categories and reports pass rate, confidence, topic coverage, and hallucination rate.

```bash
cd backend && npm test
```

```
Overall: 27/29 passed (93.1%)

By Category:
  factual                ██████████ 11/11 (100%)
  calendar_short         ██████████  5/5  (100%)
  calendar_extended      ████████░░  3/4   (75%)
  hallucination_test     ████████░░  4/5   (80%)
  synthesis              ██████████  4/4  (100%)

Quality Metrics:
  Avg Confidence:     70.5%
  Avg Topic Coverage: 80.7%
  Avg Sources:        9.6
  Hallucination Rate: 3.4%
```

Each test case defines expected topics that must appear in the response, forbidden strings that must not appear, and a minimum confidence threshold. See `backend/src/evaluation/test.js` for the full suite and `docs/DESIGN.md` for how confidence is calculated.

The two remaining failures are test definition issues, not model failures - the responses are correct but use different phrasing than the test expects ("Apr" vs "April", "don't have that info" vs "privacy").

---

## Key design decisions

**Dynamic calendar window:** Fetching 60 days of recurring events upfront produces ~65 documents and floods the retrieval set. The default fetch is 14 days (~16 events). The query is analyzed before retrieval to detect future dates, month names, or semester-level keywords, and the window expands to 60 days only when needed.

**Post-retrieval day/month filtering:** Semantic retrieval alone doesn't guarantee day-specific accuracy. After retrieval, calendar documents are hard-filtered to the requested day or month. A query for "Tuesday" only sees Tuesday events in its context window.

**Hybrid scoring:** Pure cosine similarity missed exact-match queries like "ECE 445" or "Vertiv" where embedding similarity doesn't cluster tightly enough. A keyword boost (+0.02 per matching term) pulls up documents that contain exact query terms alongside the semantic score.

**Confidence calibration:** OpenAI embedding similarity for these document types typically ranges 0.30-0.60, not 0-1. Confidence thresholds are calibrated to this real range. Scores above 0.45 map to 90% confidence; below 0.30 maps to 30%. Responses that admit uncertainty are capped at 30% regardless of retrieval score.

Full decision log with tradeoffs in `docs/DESIGN.md`.

---

## Deployment

The app is deployed as a single Railway service. The backend serves the built React frontend as static files in production, so only one service and one URL is needed.

```bash
npm install -g @railway/cli
railway login
railway link
railway service
railway variables set OPENAI_API_KEY=...
railway variables set GOOGLE_CREDENTIALS='...'  # contents of credentials.json
railway variables set GOOGLE_TOKEN='...'         # contents of token.json
railway variables set NODE_ENV=production
railway variables set TZ=America/Chicago
railway up
```

---

## What I'd build next

**Streaming responses** - the current approach buffers the full response before displaying. Streaming would feel significantly faster for longer answers.

**LLM-as-judge hallucination detection** - the current `shouldNotContain` string matching is a sanity check, not a real hallucination detector. A second model call to verify claims against source documents would catch subtle invented facts.

**Incremental calendar embeddings** - currently re-embeds all calendar events on each cache refresh. For a busier calendar this gets expensive. Diffing against the previous event set and only embedding new/changed events would reduce API calls.

**Additional data sources** - Gmail for recent conversations, Notion or Google Drive for projects, GitHub for commit history. The RAG pipeline is source-agnostic; each new source just needs a formatter that produces embeddable document strings.

**Persistent conversation memory** - current context window is last 6 messages. A vector store for conversation history would support longer sessions and let the twin remember things discussed earlier.

**Supporting multimodal input** - images, PDFs, spreadsheets, and code files dropped directly into the chat - would make data onboarding seamless and significantly expand what the twin can reason about without manual reformatting.
