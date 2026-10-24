import dotenv from 'dotenv';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation } from '@langchain/langgraph';
import pg from 'pg';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  getPromptForCategory
} from './prompts.js';

dotenv.config();


import { pool } from '../db/db.js';

/**
 * 1. Zod Schema for Structured Classification & Priority Scoring
 */
export const ClassificationSchema = z.object({
  category: z.enum([
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry'
  ]).describe('The classified functional department at BookLeaf Publishing House'),
  priority_score: z.number().int().min(1).max(10).describe('Urgency score on a scale of 1 to 10: 1-3 Low, 4-7 Medium, 8-9 High, 10 Critical'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).describe('Mapped priority level based strictly on the priority_score'),
  reasoning: z.string().describe('One concise sentence explaining why this priority score and category were assigned')
});

/**
 * 2. LangGraph State Annotation
 */
export const TicketAgentAnnotation = Annotation.Root({
  ticket_id: Annotation(),
  author_id: Annotation(),
  author_name: Annotation(),
  author_email: Annotation(),
  book_id: Annotation(),
  book_title: Annotation(),
  book_status: Annotation(),
  subject: Annotation(),
  description: Annotation(),
  file_attachment_name: Annotation(),
  category: Annotation(),
  priority: Annotation(),
  priority_score: Annotation(),
  reasoning: Annotation(),
  ai_draft_response: Annotation()
});

/**
 * Helper to initialize ChatOpenAI
 * Validates API key configuration and throws meaningful, actionable errors if unconfigured.
 */
function getLLMClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(apiKey);

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your-openai-api-key') || apiKey.includes('sk-placeholder')) {
    throw new Error('OPENAI_API_KEY is missing or unconfigured in backend/.env. Please provide a valid OpenAI API key to execute AI triage.');
  }

  let modelName = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

  return new ChatOpenAI({
    modelName: modelName,
    temperature: 0.2,
    openAIApiKey: apiKey,
  });
}

/**
 * Node 1: Classifier & Prioritizer Node
 * Executes live structured output via LangChain ChatOpenAI.
 */
async function classifyAndPrioritizeNode(state) {
  const llm = getLLMClient();
  const structuredLlm = llm.withStructuredOutput(ClassificationSchema);

  const prompt = `
${CLASSIFICATION_SYSTEM_PROMPT}

TICKET TO ANALYZE:
Author Name: ${state.author_name || 'Author'} (${state.author_email || 'N/A'})
Book Context: ${state.book_title ? `Title: "${state.book_title}" (Status: ${state.book_status || 'Unknown'})` : 'General / Account Level Query'}
Subject: ${state.subject}
Detailed Query Description: ${state.description || state.subject}
File Attached: ${state.file_attachment_name || 'None'}
`;

  const result = await structuredLlm.invoke(prompt);
  return {
    category: result.category,
    priority: result.priority,
    priority_score: result.priority_score,
    reasoning: result.reasoning
  };
}

/**
 * Node 2: Category-Specific Response Generator Node
 * Dynamically routes to the isolated domain prompt for the classified category.
 */
async function generateResponseNode(state) {
  const llm = getLLMClient();
  const categoryPrompt = getPromptForCategory(state.category);

  const userPrompt = `
${categoryPrompt}

TICKET DETAILS:
Author Name: ${state.author_name || 'Author'}
Author Email: ${state.author_email || 'N/A'}
Book Linked: ${state.book_title ? `"${state.book_title}" (ID: ${state.book_id || 'N/A'}, Status: ${state.book_status || 'Published'})` : 'None (General Inquiry)'}
Ticket Subject: ${state.subject}
Author's Detailed Message: ${state.description || state.subject}
Attachment Included: ${state.file_attachment_name ? `Yes (${state.file_attachment_name})` : 'No'}
Classified Priority: ${state.priority} (Score: ${state.priority_score}/10)
Classification Reason: ${state.reasoning}

Draft a complete, compassionate, and specific response following the BookLeaf policy guidelines and communication tone.
Do not use placeholders like [Insert Date]; use realistic, specific operational timelines as defined in the policies.
`;

  const response = await llm.invoke(userPrompt);
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  return { ai_draft_response: content.trim() };
}

/**
 * Node 3: Database Persistence Node
 * Persists the real AI classification, priority score, reasoning, and draft response into PostgreSQL.
 */
async function persistResultsNode(state) {
  if (!state.ticket_id) return state;

  const query = `
    UPDATE tickets
    SET 
      category = $1,
      priority = $2,
      ai_category = $1,
      ai_priority = $2,
      ai_priority_score = $3,
      ai_reasoning = $4,
      ai_draft_response = $5,
      updated_at = NOW()
    WHERE ticket_id = $6
  `;

  await pool.query(query, [
    state.category,
    state.priority,
    state.priority_score,
    state.reasoning,
    state.ai_draft_response,
    state.ticket_id
  ]);

  console.log(`🤖 AI Agent successfully triaged ticket ${state.ticket_id}:`, {
    category: state.category,
    priority: `${state.priority} (${state.priority_score}/10)`,
  });

  return state;
}

/**
 * Build and compile the LangGraph Workflow
 */
const ticketWorkflow = new StateGraph(TicketAgentAnnotation)
  .addNode('classifyAndPrioritize', classifyAndPrioritizeNode)
  .addNode('generateResponse', generateResponseNode)
  .addNode('persistResults', persistResultsNode)
  .addEdge('__start__', 'classifyAndPrioritize')
  .addEdge('classifyAndPrioritize', 'generateResponse')
  .addEdge('generateResponse', 'persistResults')
  .addEdge('persistResults', '__end__');

export const ticketAgentApp = ticketWorkflow.compile();

/**
 * Trigger the LangGraph AI Agent for a ticket.
 * In case of an AI failure or missing API key, records the real error state in the database
 * so the admin queue transparently displays the failure reason instead of silent generic errors.
 */
export async function runTicketAiAgent(ticketData) {
  console.log(`🚀 Triggering LangGraph AI Agent for Ticket ${ticketData.ticket_id}...`);

  // Look up book title if book_id was provided
  let bookTitle = null;
  let bookStatus = null;
  if (ticketData.book_id) {
    try {
      const bookRes = await pool.query('SELECT title, status FROM books WHERE book_id = $1', [ticketData.book_id]);
      if (bookRes.rows.length > 0) {
        bookTitle = bookRes.rows[0].title;
        bookStatus = bookRes.rows[0].status;
      }
    } catch (e) {
      console.warn('Could not fetch book details:', e.message);
    }
  }

  // Look up author name & email if not passed
  let authorName = ticketData.author_name;
  let authorEmail = ticketData.author_email;
  if (!authorName && ticketData.author_id) {
    try {
      const authorRes = await pool.query('SELECT name, email FROM authors WHERE author_id = $1', [ticketData.author_id]);
      if (authorRes.rows.length > 0) {
        authorName = authorRes.rows[0].name;
        authorEmail = authorRes.rows[0].email;
      }
    } catch (e) {
      console.warn('Could not fetch author details:', e.message);
    }
  }

  const initialState = {
    ticket_id: ticketData.ticket_id,
    author_id: ticketData.author_id,
    author_name: authorName || 'Author',
    author_email: authorEmail || '',
    book_id: ticketData.book_id || null,
    book_title: bookTitle,
    book_status: bookStatus,
    subject: ticketData.subject,
    description: ticketData.description || ticketData.subject,
    file_attachment_name: ticketData.file_attachment_name || null
  };

  try {
    const finalState = await ticketAgentApp.invoke(initialState);
    return finalState;
  } catch (err) {
    console.error(`❌ LangGraph AI Agent failed for ticket ${ticketData.ticket_id}:`, err.message);

    // Persist real error message in database for admin visibility
    try {
      await pool.query(
        `UPDATE tickets 
         SET ai_reasoning = $1, 
             ai_draft_response = $2, 
             updated_at = NOW() 
         WHERE ticket_id = $3`,
        [
          `AI Service Error: ${err.message}`,
          `[AI Draft Generation Failed: ${err.message}]`,
          ticketData.ticket_id
        ]
      );
    } catch (dbErr) {
      console.error('Failed to record AI error in database:', dbErr.message);
    }

    throw err;
  }
}
