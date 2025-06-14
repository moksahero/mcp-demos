import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { getMCPTools } from '../tools/perplexity-tool';

// Create an async function to initialize the agent with MCP tools
export async function createPerplexityAgent() {
  const mcpTools = await getMCPTools();
  
  return new Agent({
    name: 'Perplexity Agent',
    instructions: `
      You are a knowledgeable research assistant powered by Perplexity search capabilities.

      Your primary function is to help users find accurate, up-to-date information on any topic. When responding:
      - Always search for the most recent and relevant information
      - Provide comprehensive answers based on the search results
      - Include sources when available
      - Be clear about what information comes from search results vs. general knowledge
      - If a search returns no results, suggest alternative search queries
      - Keep responses informative but well-structured

      Use the available MCP tools to search for information and answer user queries.
    `,
    model: openai('gpt-4o-mini'),
    tools: mcpTools,
    memory: new Memory({
      storage: new LibSQLStore({
        url: 'file:../mastra.db', // path is relative to the .mastra/output directory
      }),
    }),
  });
}