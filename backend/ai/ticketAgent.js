import dotenv from 'dotenv';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation } from '@langchain/langgraph';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  getPromptForCategory
} from './prompts.js';

dotenv.config();

import { pool, dataService } from '../db/db.js';

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
 * Uses the exact configured model (e.g. gpt-5.6-luna) and supports custom OPENAI_BASE_URL if configured.
 */
function getLLMClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your-openai-api-key') || apiKey.includes('sk-placeholder')) {
    throw new Error('OPENAI_API_KEY is missing or unconfigured in backend/.env. Please provide a valid API key.');
  }

  const modelName = (process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim();

  const options = {
    modelName: modelName,
    temperature: 0.2,
    openAIApiKey: apiKey,
  };

  if (process.env.OPENAI_BASE_URL) {
    options.configuration = {
      baseURL: process.env.OPENAI_BASE_URL.trim()
    };
  }

  return new ChatOpenAI(options);
}

/**
 * Node 1: Classifier & Prioritizer Node
 * Executes live structured output, with JSON fallback if tools calling is unsupported by the endpoint.
 */
async function classifyAndPrioritizeNode(state) {
  const llm = getLLMClient();

  const prompt = `
${CLASSIFICATION_SYSTEM_PROMPT}

TICKET TO ANALYZE:
Author Name: ${state.author_name || 'Author'} (${state.author_email || 'N/A'})
Book Context: ${state.book_title ? `Title: "${state.book_title}" (Status: ${state.book_status || 'Unknown'})` : 'General / Account Level Query'}
Subject: ${state.subject}
Detailed Query Description: ${state.description || state.subject}
File Attached: ${state.file_attachment_name || 'None'}
`;

  try {
    const structuredLlm = llm.withStructuredOutput(ClassificationSchema);
    const result = await structuredLlm.invoke(prompt);
    return {
      category: result.category,
      priority: result.priority,
      priority_score: result.priority_score,
      reasoning: result.reasoning
    };
  } catch (err) {
    console.warn(`Tools structured output failed (${err.message}), falling back to direct JSON parsing:`);
    const jsonPrompt = `${prompt}
Respond ONLY with a valid JSON object matching this exact schema:
{
  "category": "Royalty & Payments" | "ISBN & Metadata Issues" | "Printing & Quality" | "Distribution & Availability" | "Book Status & Production Updates" | "General Inquiry",
  "priority_score": <number between 1 and 10>,
  "priority": "Critical" | "High" | "Medium" | "Low",
  "reasoning": "<one concise analytical sentence>"
}`;
    const rawRes = await llm.invoke(jsonPrompt);
    const text = typeof rawRes.content === 'string' ? rawRes.content : JSON.stringify(rawRes.content);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || 'General Inquiry',
        priority: parsed.priority || 'Medium',
        priority_score: Number(parsed.priority_score) || 5,
        reasoning: parsed.reasoning || 'Classified by AI agent'
      };
    }
    throw err;
  }
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
 * Persists the AI classification, priority score, reasoning, and draft response into PostgreSQL & Memory Store.
 */
async function persistResultsNode(state) {
  if (!state.ticket_id) return state;

  await dataService.updateTicketAiAnalysis(state.ticket_id, {
    category: state.category,
    priority: state.priority,
    priority_score: state.priority_score,
    reasoning: state.reasoning,
    ai_draft_response: state.ai_draft_response
  });

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
 */
export async function runTicketAiAgent(ticketData) {
  console.log(`🚀 Triggering LangGraph AI Agent for Ticket ${ticketData.ticket_id}...`);

  // Look up book title if book_id was provided
  let bookTitle = null;
  let bookStatus = null;
  if (ticketData.book_id) {
    try {
      const allAuthors = await dataService.getAllAuthors();
      for (const a of allAuthors) {
        const found = (a.books || []).find(b => b.book_id === ticketData.book_id);
        if (found) {
          bookTitle = found.title;
          bookStatus = found.status;
          break;
        }
      }
    } catch (e) {
      console.warn('Could not fetch book details:', e.message);
    }
  }

  // Look up author name & email if not passed
  let authorName = ticketData.author_name;
  let authorEmail = ticketData.author_email;
  if ((!authorName || !authorEmail) && ticketData.author_id) {
    try {
      const author = await dataService.getAuthorByIdOrEmail(ticketData.author_id);
      if (author) {
        authorName = authorName || author.name;
        authorEmail = authorEmail || author.email;
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

    // Persist real error message via dataService so in-memory fallback works too
    try {
      await dataService.updateTicketAiAnalysis(ticketData.ticket_id, {
        reasoning: `AI Service Error: ${err.message}`,
        ai_draft_response: `[AI Draft Generation Failed: ${err.message}]`
      });
    } catch (dbErr) {
      console.error('Failed to record AI error in database:', dbErr.message);
    }

    throw err;
  }
}
