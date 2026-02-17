import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embedding for a text using OpenAI's embedding model
 * @param {string} text - Text to embed
 * @returns {Array} - Embedding vector
 */
export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate a response using GPT
 * @param {Object} params - Parameters for generation
 * @returns {string} - Generated response
 */
export async function generateResponse({ query, context, conversationHistory, systemPrompt }) {
  try {
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Add conversation history
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      // Add current query with context
      {
        role: 'user',
        content: `Context from my personal data:\n${context}\n\nQuestion: ${query}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini model as recommended
      messages,
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Generation error:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Batch generate embeddings for multiple texts
 * @param {Array<string>} texts - Array of texts to embed
 * @returns {Array<Array>} - Array of embedding vectors
 */
export async function batchGenerateEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Batch embedding error:', error);
    throw new Error('Failed to generate batch embeddings');
  }
}
