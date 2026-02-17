import { loadPersonalData } from './dataLoader.js';
import { cosineSimilarity } from '../utils/math.js';

/**
 * Retrieve relevant documents based on query embedding
 * @param {Array} queryEmbedding - Embedding vector of the query
 * @param {string} queryText - Original query text for filtering
 * @returns {Array} - Relevant documents with scores
 */
export async function retrieveRelevantData(queryEmbedding, queryText, windowDays = 14) {
  const dataStore = await loadPersonalData(windowDays);

  const isTemporalQuery = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|week|day|month|january|february|march|april|may|june|july|august|september|october|november|december|schedule|calendar|class|classes|events?|meeting)\b/i.test(queryText);

  // Extract keywords from query for boosting
  const queryKeywords = queryText.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(w => w.length > 3);  // Skip short words

  const scoredDocuments = dataStore.map(doc => {
    const semanticScore = cosineSimilarity(queryEmbedding, doc.embedding);
    
    // Keyword boost: if query keywords appear in doc content
    const contentLower = doc.content.toLowerCase();
    const keywordMatches = queryKeywords.filter(kw => contentLower.includes(kw)).length;
    const keywordBoost = keywordMatches * 0.02;  // +2% per keyword match
    
    // Recency boost for calendar docs
    const recencyBoost = doc.type === 'calendar' && isTemporalQuery ? 0.01 : 0;

    return {
      ...doc,
      score: semanticScore + keywordBoost + recencyBoost,
      semanticScore,   // original for debugging
      keywordMatches
    };
  });

  scoredDocuments.sort((a, b) => b.score - a.score);

  const TOP_K = windowDays > 14 ? 30 : isTemporalQuery ? 20 : 7;
  const threshold = isTemporalQuery ? 0.2 : 0.3;

  const results = scoredDocuments
    .filter(doc => doc.score >= threshold)
    .slice(0, TOP_K);

  console.log(`Retrieved ${results.length} docs | Top score: ${results[0]?.score.toFixed(3)} | Temporal: ${isTemporalQuery}`);

  return results;
}

