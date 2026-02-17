# Evaluation & Testing

## Overview

This document explains how we evaluate the Digital Twin MVP to ensure it's working as expected.

## Evaluation Philosophy

A digital twin should:
1. **Be accurate** - Responses should be grounded in actual data
2. **Be honest** - Admit when it doesn't know something
3. **Be transparent** - Show sources and confidence
4. **Be helpful** - Actually answer the question asked

## Test Suite

We've created 7 automated test cases covering different scenarios:

### 1. Project Information
**Query:** "What projects am I working on?"
**Expected:** Should mention Project Alpha, authentication work
**Why:** Tests ability to retrieve and synthesize work-related data

### 2. Technical Skills
**Query:** "What programming languages do I know?"
**Expected:** Should list JavaScript, TypeScript, Python, React, Node
**Why:** Tests factual retrieval from profile/notes

### 3. Meetings and Schedule
**Query:** "When is my team sync meeting?"
**Expected:** Should mention Monday, 10am, weekly
**Why:** Tests calendar data integration

### 4. Reading Interests
**Query:** "What books am I planning to read?"
**Expected:** Should mention specific book titles
**Why:** Tests note-taking data retrieval

### 5. Career Goals
**Query:** "What are my career goals?"
**Expected:** Should mention senior engineering, AI/ML focus
**Why:** Tests longer-form document understanding

### 6. Unknown Information (Critical Test)
**Query:** "What is my favorite color?"
**Expected:** Should express uncertainty ("I don't have that information")
**Why:** Tests uncertainty handling - crucial for trust

### 7. Specific Person Context
**Query:** "Who is Sarah?"
**Expected:** Should identify as manager, connect to Project Alpha
**Why:** Tests multi-source information synthesis

## Running the Evaluation

```bash
cd backend
npm test
```

This will:
1. Run each test case against the digital twin
2. Check if expected topics appear in responses
3. Verify confidence scores are appropriate
4. Report pass/fail for each test
5. Show overall success rate

## Expected Results

**Target Success Rate:** 85%+ (6/7 tests passing)

**Sample Output:**
```
🧪 Running Digital Twin Evaluation Tests
============================================================

Test: Project Information
Query: "What projects am I working on?"
✅ PASSED
Response: I'm currently working on Project Alpha, which is in the development phase...
Confidence: 78.5%
Topics found: 3/3
Sources: 2

Test: Unknown Information
Query: "What is my favorite color?"
✅ PASSED
Response: I don't have that information in my records...
Confidence: 32.0%
Topics found: 1/1
Sources: 0

...

📊 Evaluation Summary
Total Tests: 7
Passed: 6 ✅
Failed: 1 ❌
Success Rate: 85.7%
```

## Manual Testing

Beyond automated tests, you should manually test:

### 1. Conversation Flow
- Ask follow-up questions
- Check if context is maintained
- Verify natural conversation

### 2. Source Quality
- Click "sources" on responses
- Verify sources are actually relevant
- Check if relevance scores make sense

### 3. Edge Cases
- Very vague questions
- Questions requiring multiple sources
- Questions with no relevant data
- Long conversation threads

### 4. UI/UX
- Loading states appear appropriately
- Messages are readable
- Sources expand/collapse smoothly
- Input is responsive

## Metrics We Track

### 1. Retrieval Quality
- **Precision**: % of retrieved docs that are relevant
- **Recall**: % of relevant docs that were retrieved
- **Relevance Score**: Cosine similarity of top result

### 2. Response Quality
- **Topic Coverage**: Are expected topics mentioned?
- **Hallucination Rate**: Does it make up information?
- **Helpfulness**: Does it actually answer the question?

### 3. Confidence Calibration
- **High Confidence (>0.7)**: Should have strong source matches
- **Medium Confidence (0.4-0.7)**: Partial information available
- **Low Confidence (<0.4)**: Little or no relevant data

### 4. System Performance
- **Response Time**: < 3 seconds for 95th percentile
- **Embedding Time**: < 2 seconds for initial load
- **Error Rate**: < 5% of requests

## Known Limitations

1. **Small Data Set**: Only 10 documents, so limited knowledge
2. **No Temporal Understanding**: Doesn't handle "recent" or "upcoming" well
3. **No Multi-Turn Memory**: Each query is independent
4. **Limited Personalization**: Generic personality, not user-specific tone

## Success Criteria

The digital twin is "working" if:
- ✅ It can answer factual questions from the data (accuracy)
- ✅ It admits when it doesn't know (honesty)
- ✅ It cites relevant sources (transparency)
- ✅ Confidence scores correlate with quality (calibration)
- ✅ UI is functional and responsive (usability)

## Failure Modes & Debugging

### Problem: Low confidence on all queries
**Diagnosis:** Embeddings might not be generated or similarity threshold too high
**Fix:** Check embeddings.json exists, verify similarity calculation

### Problem: Irrelevant sources cited
**Diagnosis:** Retrieval is finding wrong documents
**Fix:** Check cosine similarity implementation, review embedding quality

### Problem: Generic responses
**Diagnosis:** Not using retrieved context properly
**Fix:** Review prompt construction in digitalTwin.js

### Problem: Hallucinations
**Diagnosis:** Model inventing information not in sources
**Fix:** Adjust system prompt to emphasize grounding in context

## Continuous Improvement

To improve the digital twin:
1. **Collect failure cases** - Track questions it answers poorly
2. **Analyze patterns** - What types of queries fail?
3. **Iterate on prompts** - Refine system instructions
4. **Improve retrieval** - Consider hybrid search, re-ranking
5. **Add more data** - Richer data → better responses

## Comparison to Baseline

**Without RAG (Just GPT):**
- Knows nothing about the user
- Generic responses
- No source citations
- Confidence would be falsely high

**With RAG (This Implementation):**
- Personalized based on actual data
- Specific, grounded responses
- Source transparency
- Honest about uncertainty

The improvement is dramatic and measurable through our test suite.
