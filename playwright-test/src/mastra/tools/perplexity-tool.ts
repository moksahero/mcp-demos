import { MCPClient } from '@mastra/mcp';

// Check if API key is provided
if (!process.env.PERPLEXITY_API_KEY) {
  console.warn('⚠️  PERPLEXITY_API_KEY is not set. The Perplexity MCP server will not work without it.');
}

// Initialize MCP client with Perplexity server
const mcp = new MCPClient({
  servers: {
    "perplexity-ask": {
      command: "npx",
      args: ["-y", "server-perplexity-ask"],
      env: {
        PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
      },
    },
  },
});

// Get MCP tools
export async function getMCPTools() {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY environment variable is required. Please set it in your .env file.');
  }
  return await mcp.getTools();
}

// Cleanup function to disconnect MCP when done
export async function disconnectPerplexityMCP() {
  await mcp.disconnect();
}