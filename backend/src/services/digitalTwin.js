import { generateEmbedding, generateResponse } from './openai.js';
import { retrieveRelevantData } from './retrieval.js';

const PERSONALITY_PROMPT = `You are Varun Sharma, speaking directly as yourself in first person.

# IDENTITY
Computer Engineering student at UIUC (graduating May 2026). AI/ML experience: Vertiv (GenAI/RL), Sensiboo (ML), MhyMatch (Software). Specialized in LLMs, RAG, reinforcement learning. Led 15-person BCI car project.

# DATA SOURCES
- LinkedIn: work history, education, skills, projects
- Calendar: next 2 weeks of events (classes, meetings)
- Only use information present in these sources

# RESPONSE RULES (Priority Order)

## 1. FIRST PERSON (Critical)
- ALWAYS use "I", "my", "me" - NEVER "you" or "your"
- You ARE Varun speaking, not an assistant talking about Varun
- Bad : "You have LLM at 9:30" → Good: "I've got LLM at 9:30"
- Bad : "Your next class is..." → Good: "My next class is..."

## 2. COMPLETENESS (Critical)
- For schedule queries, always list ALL events for that day/period
- NEVER omit events - if there are 3 classes, list all 3
- Do NOT say "that's everything" unless you are certain
- Never apologize for missing info - just be complete the first time

## 3. ANTI-HALLUCINATION (Critical)
- NEVER invent companies, roles, dates, or events not in your data
- For unknown info: "I don't have that info" or "Not sure, actually"
- For calendar availability: Only confirm free time if you see the complete day
- If unsure: ask clarifying question instead of guessing

## 4. LENGTH CONSTRAINTS
- Default: 50-75 words (2-3 sentences)
- Simple facts: 1 sentence ("May 2026")
- Maximum: 100 words unless asked for detail
- NO numbered lists, NO sub-bullets, NO essay responses

## 5. COMMUNICATION STYLE
Talk casually and directly:
- Use contractions: "I've worked with LLMs at Vertiv..."
- Lead with answer first, then context
- Show personality: "The BCI project was awesome"
- Natural language: "Tuesday's packed - LLM at 9:30, Algorithms at 12:30, Senior Design at 4"

## 6. GROUNDING
Tie answers to specific sources:
- "At Vertiv, I built an RL system for prompt optimization"
- "From my calendar, I've got three classes Tuesday"

## 7. PRIVACY
Never share: home address, phone, private email, meeting links, exact locations.
Describe events generally: "a 1:1" not names/titles.

# RESPONSE PATTERNS

**Schedule:** List ALL events naturally by time
Example: "Tuesday's packed - I've got LLM at 9:30, Algorithms at 12:30, and Senior Design at 4."

**Work experience:** "[Role/project]. [One specific detail]. [Impact]."
Example: "At Vertiv I built an RL prompt optimizer. Cut latency 15% while keeping 98% accuracy."

**Unknown info:** "I don't have that info" or offer related info you DO know

**Complex topics:** Brief answer + offer to elaborate
Example: "I use RAG for grounding - basically vector search + semantic retrieval. Want me to explain the architecture?"

# VOICE CHECKLIST
Before every response verify:
□ Using "I/my/me" throughout (never "you/your")
□ Listed ALL relevant events/info (nothing omitted)
□ Under 100 words
□ No invented facts
□ Conversational tone

Goal: Sound like Varun texting a colleague - direct, complete, first-person, efficient.`;

// Analyzes the query to determine how far ahead to fetch calendar data.
// Default is 14 days. Returns 60 if the query references a specific future date,
// a month name that extends beyond the current cache window, or keywords
// that imply semester-level or far-future scheduling needs.
function detectTimeWindow(query) {
  const today = new Date();
  const cacheEndDate = new Date();
  cacheEndDate.setDate(cacheEndDate.getDate() + 14);

  const datePattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i;
  const dateMatch = query.match(datePattern);
  if (dateMatch) {
    const monthMap = {
      'jan': 0, 'january': 0, 'feb': 1, 'february': 1,
      'mar': 2, 'march': 2, 'apr': 3, 'april': 3,
      'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
      'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
      'oct': 9, 'october': 9, 'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };
    const monthIndex = monthMap[dateMatch[1].toLowerCase()];
    let targetDate = new Date(today.getFullYear(), monthIndex, parseInt(dateMatch[2]));
    if (targetDate < today) targetDate.setFullYear(today.getFullYear() + 1);

    if (targetDate > cacheEndDate) {
      console.log(`Extended window: "${dateMatch[0]}" is outside 14-day cache`);
      return 60;
    }
  }

  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  for (const month of monthNames) {
    if (query.toLowerCase().includes(month)) {
      const monthIndex = monthNames.indexOf(month);
      const monthStart = new Date(today.getFullYear(), monthIndex, 1);
      const monthEnd = new Date(today.getFullYear(), monthIndex + 1, 0);

      if (monthEnd < today) {
        monthStart.setFullYear(today.getFullYear() + 1);
        monthEnd.setFullYear(today.getFullYear() + 1);
      }

      if (monthEnd > cacheEndDate) {
        console.log(`Extended window: month "${month}" extends beyond 14-day cache`);
        return 60;
      }
    }
  }

  const farFuturePatterns = [
    /next month/i, /in \d+ weeks/i, /in a month/i,
    /end of (the )?semester/i, /rest of (the )?semester/i,
    /spring break/i, /finals/i,
    /full (semester |year )?schedule/i, /entire semester/i,
    /all (my )?classes/i, /how many times/i, /how often/i
  ];
  for (const pattern of farFuturePatterns) {
    if (pattern.test(query)) {
      console.log(`Extended window: matched "${pattern}"`);
      return 60;
    }
  }

  return 14;
}

export async function processQuery(query, conversationHistory = []) {
  const queryEmbedding = await generateEmbedding(query);
  const windowDays = detectTimeWindow(query);

  let relevantData = await retrieveRelevantData(queryEmbedding, query, windowDays);

  // If the query targets a specific day of the week, filter calendar docs
  // down to only events on that day. Non-calendar docs are kept in full.
  const dayMatch = query.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayMatch) {
    const requestedDay = dayMatch[0].toLowerCase();
    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    const requestedDayNum = dayMap[requestedDay];

    const calendarDocs = relevantData.filter(d => d.type === 'calendar');
    const otherDocs = relevantData.filter(d => d.type !== 'calendar');

    const filteredCalendarDocs = calendarDocs.filter(doc => {
      return new Date(doc.date).getDay() === requestedDayNum;
    });

    console.log(`Day filter [${requestedDay}]: ${calendarDocs.length} → ${filteredCalendarDocs.length} events`);
    relevantData = [...filteredCalendarDocs, ...otherDocs];
  }

  // If the query targets a specific month, filter calendar docs to that month.
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthMatch = query.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (monthMatch) {
    const requestedMonth = monthMatch[0].toLowerCase();
    const requestedMonthNum = monthNames.indexOf(requestedMonth);

    const calendarDocs = relevantData.filter(d => d.type === 'calendar');
    const otherDocs = relevantData.filter(d => d.type !== 'calendar');

    const filteredCalendarDocs = calendarDocs.filter(doc => {
      return new Date(doc.date).getMonth() === requestedMonthNum;
    });

    console.log(`Month filter [${requestedMonth}]: ${calendarDocs.length} → ${filteredCalendarDocs.length} events`);
    relevantData = [...filteredCalendarDocs, ...otherDocs];
  }

  // Inject current date/time so the model can reason about "today", "this week", etc.
  const now = new Date();
  const dateContext = `Current date and time: ${now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const context = dateContext + '\n\n' + buildContext(relevantData);

  const response = await generateResponse({
    query,
    context,
    conversationHistory,
    systemPrompt: PERSONALITY_PROMPT
  });

  const chunks = splitIntoChunks(response);
  const confidence = calculateConfidence(relevantData, response);

  return {
    answer: response,
    chunks,
    sources: relevantData.map(d => ({
      type: d.type,
      snippet: d.content.substring(0, 100) + '...',
      relevanceScore: d.score
    })),
    confidence
  };
}

// Splits long responses into sentence-bounded chunks for sequential display.
// Most responses are under 400 chars and return as a single chunk.
function splitIntoChunks(text, maxChunkLength = 400) {
  if (text.length <= maxChunkLength) return [text];

  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

function buildContext(relevantData) {
  if (relevantData.length === 0) return 'No relevant personal data found.';

  return relevantData.map((item, idx) =>
    `[Source ${idx + 1} - ${item.type}]\n${item.content}\n`
  ).join('\n---\n');
}

// Confidence is derived from the top cosine similarity score in the retrieved set.
// Thresholds are calibrated to the actual range of OpenAI embedding similarity scores
// (typically 0.30-0.60 for these document types, not the 0-1 theoretical range).
// Bonuses applied for source volume and multi-type retrieval (calendar + static).
// Capped at 0.3 when the response admits uncertainty.
function calculateConfidence(relevantData, response) {
  if (relevantData.length === 0) return 0.1;

  const topScore = Math.max(...relevantData.map(d => d.score));
  const calendarDocs = relevantData.filter(d => d.type === 'calendar').length;
  const staticDocs = relevantData.filter(d => d.type !== 'calendar').length;

  let confidence;
  if (topScore > 0.45) confidence = 0.9;
  else if (topScore > 0.40) confidence = 0.75;
  else if (topScore > 0.35) confidence = 0.6;
  else if (topScore > 0.30) confidence = 0.45;
  else confidence = 0.3;

  if (relevantData.length >= 5) confidence = Math.min(confidence + 0.05, 1.0);
  if (relevantData.length >= 10) confidence = Math.min(confidence + 0.05, 1.0);
  if (calendarDocs > 0 && staticDocs > 0) confidence = Math.min(confidence + 0.05, 1.0);

  const uncertaintyPhrases = ["don't have", 'not sure', "don't know", 'no information', "can't find"];
  if (uncertaintyPhrases.some(p => response.toLowerCase().includes(p))) {
    confidence = Math.min(confidence, 0.3);
  }

  return confidence;
}