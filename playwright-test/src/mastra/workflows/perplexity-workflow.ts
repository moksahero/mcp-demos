import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const llm = openai('gpt-4o-mini');

const agent = new Agent({
  name: 'Perplexity Research Agent',
  model: llm,
  instructions: `
        You are an expert research analyst who synthesizes information from multiple sources to provide comprehensive insights.

        When presenting research results, structure your response as follows:

        📚 RESEARCH SUMMARY
        ══════════════════════

        🔍 KEY FINDINGS
        • [Main finding 1]
        • [Main finding 2]
        • [Main finding 3]

        📊 DETAILED ANALYSIS
        [Provide a comprehensive analysis of the topic, organized into logical sections]

        💡 INSIGHTS & IMPLICATIONS
        • [Insight 1]: [Explanation]
        • [Insight 2]: [Explanation]

        🔗 SOURCES & REFERENCES
        • [Source 1]
        • [Source 2]
        (Include all relevant sources)

        📌 RECOMMENDATIONS
        • [Actionable recommendation 1]
        • [Actionable recommendation 2]

        Guidelines:
        - Synthesize information from all available sources
        - Highlight contradictions or differing viewpoints when present
        - Provide context and background information
        - Use clear, professional language
        - Include relevant statistics or data points when available
        - Maintain objectivity and note any potential biases
      `,
});

const searchResultSchema = z.object({
  query: z.string(),
  answer: z.string(),
  sources: z.array(z.string()).optional(),
});

const performSearch = createStep({
  id: 'perform-search',
  description: 'Searches for information using Perplexity MCP',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  outputSchema: searchResultSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // Get MCP tools
    const { getMCPTools } = await import('../tools/perplexity-tool');
    const mcpTools = await getMCPTools();
    
    // Find the Perplexity ask tool
    const askTool = Object.entries(mcpTools).find(([name]) => 
      name.includes('ask') || name.includes('perplexity')
    )?.[1];
    
    if (!askTool) {
      throw new Error('Perplexity ask tool not found in MCP server');
    }
    
    try {
      const result = await askTool.execute({ question: inputData.query });
      
      return {
        query: inputData.query,
        answer: result.answer || result.response || 'No answer found',
        sources: result.sources || [],
      };
    } catch (error) {
      console.error('Error searching Perplexity:', error);
      throw new Error(`Failed to search Perplexity: ${error.message}`);
    }
  },
});

const analyzeResults = createStep({
  id: 'analyze-results',
  description: 'Analyzes and synthesizes search results',
  inputSchema: searchResultSchema,
  outputSchema: z.object({
    analysis: z.string(),
  }),
  execute: async ({ inputData }) => {
    const searchResult = inputData;

    if (!searchResult) {
      throw new Error('Search result data not found');
    }

    const prompt = `Based on the following search results for "${searchResult.query}", provide a comprehensive analysis:
      
      Answer: ${searchResult.answer}
      
      Sources: ${searchResult.sources?.join(', ') || 'No sources provided'}
      
      Please synthesize this information and provide insights.`;

    const response = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let analysisText = '';

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      analysisText += chunk;
    }

    return {
      analysis: analysisText,
    };
  },
});

const perplexityWorkflow = createWorkflow({
  id: 'perplexity-workflow',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  outputSchema: z.object({
    analysis: z.string(),
  }),
})
  .then(performSearch)
  .then(analyzeResults);

perplexityWorkflow.commit();

export { perplexityWorkflow };