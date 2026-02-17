# Design Documentation

## Architecture Overview

This digital twin MVP uses a RAG (Retrieval Augmented Generation) architecture to provide personalized responses based on user data.

### System Flow

```
User Query → Frontend (React)
    ↓
Backend API (Express)
    ↓
Generate Query Embedding (OpenAI text-embedding-3-small)
    ↓
Vector Similarity Search (Cosine Similarity)
    ↓
Retrieve Top-K Relevant Documents
    ↓
Build Context from Retrieved Data
    ↓
Generate Response (OpenAI gpt-4o-mini)
    ↓
Return Response + Sources + Confidence
```

## Key Design Decisions

### 1. Data Integration Strategy

**Decision:** Use mock JSON data instead of live API integrations

**Rationale:**
- Time constraint: Setting up OAuth for Gmail/Calendar would take 2+ hours
- Focus on core RAG functionality rather than integration plumbing
- Easier to reproduce and test
- Mock data represents realistic email/calendar/notes structure

**Tradeoff:** Not truly "real-time" but demonstrates the concept effectively

**Future Enhancement:** Add Gmail API integration with OAuth flow

### 2. Vector Storage

**Decision:** In-memory storage with pre-computed embeddings saved to JSON

**Rationale:**
- Simple and fast for MVP scale (10-20 documents)
- No database setup required
- Embeddings are cached to avoid re-computing
- Reproduces easily across environments

**Tradeoff:** Not scalable to thousands of documents

**Future Enhancement:** Use Pinecone, Weaviate, or ChromaDB for production

### 3. Retrieval Strategy

**Decision:** Pure semantic search using cosine similarity

**Rationale:**
- Embeddings capture semantic meaning well
- Simple to implement and understand
- Works well for conversational queries

**Tradeoff:** Misses exact keyword matches that embeddings might not capture

**Future Enhancement:** Hybrid search combining embeddings + BM25 keyword search

### 4. Response Quality

**Decision:** Include confidence scores and source citations

**Rationale:**
- Shows transparency in how the twin makes decisions
- Helps users trust the responses
- Useful for debugging and evaluation
- Demonstrates understanding of RAG challenges

**Implementation:**
- Confidence based on retrieval quality (average similarity scores)
- Sources show which documents informed the response
- Low confidence → response acknowledges uncertainty

### 5. Frontend Design

**Decision:** Clean, single-page chat interface

**Rationale:**
- Familiar chat paradigm (like ChatGPT)
- Focus on conversation flow
- Shows sources inline without cluttering
- Responsive and accessible

**Features:**
- Real-time typing indicators
- Source expansion on click
- Confidence percentage display
- Conversation history maintained

### 6. Model Selection

**Decision:** Use gpt-4o-mini for generation, text-embedding-3-small for embeddings

**Rationale:**
- Cost-effective within API key budget
- Fast responses (important for UX)
- Mini model is sufficient for this use case
- Embedding model is optimized and cheap

**Tradeoff:** Less capable than GPT-4, but acceptable for MVP

## Evaluation Strategy

### Test Coverage

1. **Factual Accuracy Tests**
   - Does it retrieve correct information from the data?
   - Example: "What projects am I working on?" → Should mention Project Alpha

2. **Uncertainty Handling**
   - How does it handle questions with no data?
   - Example: "What's my favorite color?" → Should express uncertainty

3. **Multi-Source Integration**
   - Can it combine information from multiple sources?
   - Example: "Who is Sarah?" → Should connect email + calendar context

4. **Confidence Calibration**
   - Are confidence scores meaningful?
   - High confidence → found good sources
   - Low confidence → weak or no sources

### Metrics

- **Retrieval Precision**: Do retrieved docs contain relevant info?
- **Response Relevance**: Does the answer address the question?
- **Source Attribution**: Are cited sources actually used?
- **Confidence Correlation**: Does confidence match actual quality?

### Running Tests

```bash
cd backend
npm test
```

This runs the automated test suite with 7 test cases covering different scenarios.

## Scope Decisions

### What's Included (MVP)

✅ Interactive chat UI
✅ RAG-based personalized responses
✅ Mock data integration (emails, notes, calendar)
✅ Source citations and confidence scores
✅ Evaluation framework
✅ Clean, documented code

### What's Not Included (Future Work)

❌ Real Gmail/Calendar API integration
❌ User authentication
❌ Multi-user support
❌ Conversation persistence (memory resets on refresh)
❌ Advanced retrieval (hybrid search, re-ranking)
❌ Fine-tuning on personal writing style
❌ Privacy controls and data redaction

## Technical Stack

- **Frontend**: React + Vite (fast dev experience)
- **Backend**: Node.js + Express (simple REST API)
- **AI**: OpenAI API (gpt-4o-mini + embeddings)
- **Storage**: JSON files (easy to reproduce)
- **Search**: Cosine similarity (built from scratch)

## File Structure Rationale

```
frontend/
  src/
    components/    # Reusable UI components
    services/      # API communication layer
    
backend/
  src/
    routes/        # API endpoints
    services/      # Business logic (twin, retrieval, etc.)
    utils/         # Shared utilities (math functions)
    evaluation/    # Test suite

data/              # Personal data and embeddings
docs/              # This file!
```

**Why this structure?**
- Clear separation of concerns
- Easy to find and modify specific functionality
- Scales well if we add more features
- Standard patterns (services, routes, components)

## Next Steps (If I had more time)

1. **Week 1**: Add real Gmail integration with OAuth
2. **Week 2**: Implement hybrid search (embeddings + keywords)
3. **Week 3**: Add conversation memory and user auth
4. **Week 4**: Fine-tune personality to match user's writing style
5. **Week 5**: Deploy to production with proper DB

## Performance Considerations

- **Embedding caching**: Only compute once, save to disk
- **Lazy loading**: Only load data when needed
- **Client-side optimizations**: Debouncing, optimistic updates
- **API efficiency**: Batch embeddings when possible

Current performance:
- Initial load: ~1-2s (embedding generation)
- Query response: ~1-3s (retrieval + generation)
- Acceptable for MVP, would optimize for production

## Security & Privacy

For MVP (not production-ready):
- API key in env variables (not committed to git)
- No user authentication (single-user app)
- Mock data contains no real PII
- CORS enabled for local development only

For production, would need:
- OAuth for data access
- User authentication and session management
- Data encryption at rest and in transit
- PII redaction and anonymization
- Audit logs for data access
