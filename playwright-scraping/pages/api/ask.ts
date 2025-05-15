import type { NextApiRequest, NextApiResponse } from "next";
import dotenv from "dotenv";
import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { z } from "zod";
dotenv.config();

const mcp = new MCPClient({
  servers: {
    playwright: {
      //url: new URL("http://localhost:8931/sse"),
      command: "npx",
      args: ["@playwright/mcp"],
    },
  },
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  
  const schema = z.object({
    summary: z.string(),
    content: z.string(),
  });

  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const rawTools = await mcp.getTools();

    let wrappedTools = Object.fromEntries(
      Object.entries(rawTools).map(([name, tool]) => [
        name,
        {
          ...tool,
          execute: async (input: any) => {
            console.log(`🔧 [Tool: ${name}] Input:`, JSON.stringify(input));
            const result = await tool.execute(input);
            console.log(`✅ [Tool: ${name}] Output:`, result);
            return result;
          },
        },
      ])
    );

    const agent = new Agent({
      name: "Playwright Scraping",
      tools: wrappedTools,
      instructions: `
      あなたはPlaywrightを使ってサイトの内容を解析して、スクレーピングするエージェントです。
      出力は全部日本語でお願いします。
        `,
      model: openai("gpt-4.1-mini"),
    });

    const result = await agent.generate([{ role: "user", content: prompt }], {
      experimental_output: schema,
    });
    console.log(result.object);
    res.json(result.object);
  } catch (err) {
    res.json(err);
    console.error(err);
    res.status(500).json({ error: "Error generating response" });
  } finally {
    // 接続を明示的に終了
    console.log("Disconnecting from MCP...");
    await mcp.disconnect();
  }
}
