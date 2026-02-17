# Design Notes

## Problem framing

A digital twin that tries to do everything ends up doing nothing well. The scope here was deliberately narrow: answer questions about my professional background accurately, and answer scheduling questions in real time. Everything else was cut.
That still meant solving two problems that pull in opposite directions. Factual questions benefit from a stable, pre-computed knowledge base. Scheduling questions require live data that changes daily. The core engineering challenge was building a single retrieval pipeline that handles both without each data source degrading the other.
The second constraint that shaped every decision was hallucination. A digital twin that invents facts about you is worse than one that admits it doesn't know - especially in a professional context. This ruled out approaches that prioritized fluency over grounding.
Data sources were chosen to match the scope: a structured export of my LinkedIn profile for professional background, and Google Calendar via OAuth for live scheduling. The LinkedIn data is static - scraped and formatted locally into embeddable documents. Calendar data is live.

---

## Data model

### Static profile data

LinkedIn data is stored in `data/personal_data.json` as an array of flat document objects. Each document has an `id`, `type`, and `content` string. The content string is what gets embedded - it's written as natural prose rather than structured JSON so the embedding captures semantic meaning rather than field names.

```json
{
  "id": "experience_vertiv",
  "type": "experience",
  "content": "At Vertiv, I worked as an AI/Generative AI Engineer Intern. I engineered a reinforcement learning-driven LLM prompt optimization system that reduced response latency while maintaining semantic accuracy across internal workflows..."
}
```

Documents are grouped by type: `experience`, `education`, `skills`, `projects`, `about`. This type field is used downstream to label sources and apply type-specific retrieval boosts.

Static embeddings are generated once at first startup and saved to `data/embeddings.json`. Subsequent startups load from disk. This avoids redundant OpenAI API calls - the profile data doesn't change between sessions.

### Calendar data

Calendar events are fetched live from the Google Calendar API on each cache refresh and formatted into the same document schema as static data. The `formatCalendarEvent` function serializes each event into a prose content string:

```
Event: LLM Reasoning for Engineering. When: Tuesday, Feb 17, 9:30 AM. Duration: 80 minutes. Location: Campus Instructional Facility, Room 4025. Recurring: Yes.
```

This format was chosen deliberately. The embedding model needs to match "what time is my LLM class" against this document - natural language field ordering performs better than JSON-style `{"event": "LLM Reasoning", "time": "9:30"}` because the model was trained on prose.

Privacy decisions baked into the formatter: attendee names are stripped (only count is kept), meeting links are noted as "available" without exposing the URL, and exact home/personal locations are excluded.

---

## Retrieval pipeline

### Embedding

Queries and documents are embedded using `text-embedding-3-small`. The same model is used for both to ensure the vector space is consistent. Query embeddings are generated fresh on each request - they're not cached since queries are one-off.

### Scoring

Each document is scored against the query using a combination of cosine similarity and a keyword boost:

```
score = cosine_similarity(query_embedding, doc_embedding)
      + (keyword_matches × 0.02)
      + (calendar_boost if temporal query)
```

Pure cosine similarity performed poorly on exact-match queries. "What did I do at Vertiv?" should surface Vertiv documents at the top, but embedding similarity doesn't always cluster company names tightly enough. The keyword boost adds +0.02 per matching query term found in the document content, which reliably pulls up exact-match documents without overriding semantic ranking for broader queries.

The calendar boost (+0.01) applies to calendar documents on temporal queries. It's small - just enough to break ties in favor of calendar data over static profile docs when scores are close.

### TOP_K and thresholds

| Query type | TOP_K | Threshold |
|------------|-------|-----------|
| Factual | 7 | 0.30 |
| Temporal (14-day) | 20 | 0.20 |
| Temporal (60-day) | 30 | 0.20 |

Temporal queries need a wider retrieval net because calendar events are spread across many documents - one class meeting twice a week produces 8-16 separate documents in a 14-day window. TOP_K=7 would surface only the highest-scoring instances and miss the full picture of a day's schedule. The lower threshold (0.20 vs 0.30) is intentional: temporal queries often have low semantic similarity scores because "do I have class on Wednesday" doesn't share much vocabulary with "Event: Intro to Algorithms. When: Wednesday, Feb 18, 3:00 PM."

### Post-retrieval filtering

Semantic retrieval alone doesn't guarantee day-specific accuracy. A query for "what's on Tuesday" retrieves the highest-scoring calendar documents across all days - which may include Wednesday and Thursday events that scored slightly higher due to keyword overlap.

After retrieval, calendar documents are hard-filtered to the requested day of week or month:

```
relevantData = filteredCalendarDocs (day/month match) + allOtherDocs (no filter)
```

Non-calendar documents are always kept in full since they provide professional context that's useful regardless of the day-specific question.

---

## Calendar integration

### The recurring event problem

Google Calendar's default API behavior returns recurring events as a single rule object. Setting `singleEvents: true` expands them into individual instances - one document per occurrence. This is necessary for date-specific reasoning ("do I have class March 25?") but creates a scaling problem: 4 recurring classes meeting twice a week over 8 weeks produces 64 documents for a 60-day fetch.

At TOP_K=7, recurring event duplication fills the retrieval set with instances of the same class and pushes other classes out entirely. A query for "what classes do I have on Tuesday" would return 7 instances of LLM Reasoning and miss Senior Design and Algorithms.

The solution has two parts: keep the default fetch window at 14 days (~16 events), and scale TOP_K to 30 for extended window queries. This keeps retrieval fast and accurate for typical scheduling questions while still supporting far-future queries.

### Dynamic time window

The default calendar fetch is 14 days. Before retrieval, the query is analyzed to detect whether a larger window is needed:

- **Specific date** ("March 25") - parsed and checked against the cache end date
- **Month name** ("in April", "April schedule") - checks if the month end falls beyond the current cache window
- **Semantic keywords** ("how many times", "rest of semester", "spring break", "finals") - regex patterns that imply semester-level context

If any signal triggers, the window expands to 60 days and the cache is re-fetched. The extended cache is held for 30 minutes (vs 5 minutes for the default window) since far-future data changes less frequently.

### Caching

The document store is held in memory with two cache durations. Cache validity checks both expiry AND window coverage - a 60-day cache satisfies a 14-day request without re-fetching.

```
if (cachedData && !cacheExpired && cacheWindowDays >= requestedWindowDays)
  return cached
```

Static embeddings are never expired from the cache - they only regenerate if `embeddings.json` is deleted or `refreshEmbeddings()` is called explicitly.

### Auth and deployment

Local development uses `credentials.json` and `token.json` files. In production (Railway), these are stored as environment variables (`GOOGLE_CREDENTIALS`, `GOOGLE_TOKEN`) and parsed at runtime. The OAuth client is initialized from whichever source is available, with env variables taking priority.

The refresh token handles automatic token renewal. The current token was generated with an OAuth app in Testing mode, which means the refresh token expires every 7 days. Switching the OAuth consent screen to Production status removes this limitation.

---

## Evaluation methodology

The eval suite (`backend/src/evaluation/test.js`) runs 29 test cases and measures four things:

**Topic coverage** - keywords that must appear in the response. The primary pass/fail signal. Tests with 1-2 expected topics require 100% coverage; tests with 3+ topics require 50%. This prevents brittle failures on open-ended questions while keeping simple factual tests strict.

**Hallucination check** - strings that must not appear. Used as a sanity check for known bad outputs (invented GPAs, fake addresses, made-up names). Not exhaustive - string matching can't catch subtle invented facts. Documented limitation.

**Confidence threshold** - minimum retrieval confidence for the test to pass. Confidence is derived from the top cosine similarity score in the retrieved set, calibrated to real observed ranges (0.30-0.60 for these document types). Hallucination tests use a threshold of 0.0 since the correct answer ("I don't have that info") naturally produces low retrieval confidence.

**Source grounding** - at least one source must be cited. Hallucination tests are exempt - when the twin correctly admits uncertainty, zero sources is expected behavior.

### Results

```
Overall: 27/29 passed (93.1%)

factual                ██████████ 11/11 (100%)
calendar_short         ██████████  5/5  (100%)
calendar_extended      ████████░░  3/4   (75%)
hallucination_test     ████████░░  4/5   (80%)
synthesis              ██████████  4/4  (100%)
```

The two failures are test definition issues rather than model failures. The April schedule test expects "ECE" but the response uses "LLM" and "Senior Design" - both correct. The private info test expects "privacy" and "share" but the response says "I don't have that info" - also correct behavior, just different phrasing.

### Limitations of the eval approach

The hallucination tests rely on `shouldNotContain` string matching, which can't enumerate every possible invented fact. A more robust approach would use a second LLM call to verify each claim in the response against the retrieved source documents (LLM-as-judge). This is a known pattern but adds latency and cost - deferred as a next step.

Confidence scoring reflects retrieval quality, not answer quality. A response grounded in weakly-relevant documents but still accurate will score lower than it deserves. These are correlated but not the same thing.

---

## Tradeoffs

### RAG vs fine-tuning

Fine-tuning a model on personal data would produce more fluent first-person responses but has two critical problems for this use case: it can't incorporate live calendar data, and it's expensive to retrain when the underlying data changes. RAG keeps the data layer separate from the model, which means new data sources are additive - add a formatter, generate embeddings, done. The tradeoff is retrieval quality ceiling: the twin can only answer questions whose answers exist verbatim or near-verbatim in the document store.

### Single service vs microservices

The backend serves the built React frontend as static files in production. One Railway service, one URL, no CORS configuration needed. The tradeoff is coupling - frontend changes require a full backend redeploy. Acceptable for an MVP; a multi-user production system would separate them.

### In-memory cache vs vector database

The document store lives in memory. This is fast (no network calls for retrieval) and simple (no external dependency), but it doesn't persist across restarts and doesn't scale beyond a single process. A vector database like Pinecone or pgvector would enable persistence, multi-instance deployment, and filtered search by document type without loading the full store. The current approach becomes a bottleneck if the document set grows beyond a few hundred entries or the service needs horizontal scaling.

### Static embeddings on disk vs regenerating at startup

Static profile embeddings are computed once and saved to `embeddings.json`. This saves ~20 OpenAI API calls per restart and keeps startup fast. The tradeoff is staleness - if `personal_data.json` is updated, embeddings must be manually refreshed by deleting the file or calling `refreshEmbeddings()`. An automated diff-and-update approach would be better for a live system.

### Calendar re-embedding on every cache refresh

Calendar embeddings are fully regenerated on each cache refresh rather than incrementally updated. For 16-65 events this is fast enough (~2-3 seconds). For a user with a significantly busier calendar, or one where the 60-day window is the norm rather than the exception, embedding costs would compound. Diffing against the previous event set and only embedding new or changed events would reduce this.


### Extension impact

**New data sources** (Gmail, Notion, GitHub) - the pipeline is source-agnostic. Each new source needs a formatter that produces `{ id, type, content }` documents. The main consideration is document set size - each new source adds to the scoring pass, which stays fast up to a few thousand documents in memory but would need a vector DB beyond that.

**Multi-user** - the current cache is a module-level singleton shared across all requests. It works for a single user because the data is personal. Multi-user would require per-user document stores, per-user calendar auth, and isolated cache entries. The RAG architecture supports this but the current implementation doesn't.

**Streaming** - `generateResponse` in `openai.js` uses a blocking completion call. Switching to the streaming API requires changing the response shape from the backend and handling chunked SSE on the frontend. The chunked display logic in `ChatInterface.jsx` is a partial approximation of this - it splits completed responses and displays them with a delay rather than streaming tokens.

**Authentication** - currently there's no auth on the Railway deployment. Anyone with the URL can query the twin. Adding auth (even just a simple shared password) would require middleware on the Express routes and a login screen on the frontend. OAuth would be the right long-term approach since the app already handles Google OAuth for calendar access.
