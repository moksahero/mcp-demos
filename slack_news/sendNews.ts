import dotenv from "dotenv";
dotenv.config();

import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const mcp = new MCPClient({
  servers: {
    slack: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
      env: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
        SLACK_TEAM_ID: process.env.SLACK_TEAM_ID,
      },
    },
    "perplexity-ask": {
      command: "npx",
      args: ["-y", "server-perplexity-ask"],
      env: {
        PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      },
    },
  },
});

async function sendNews(topic: string) {
  try {
    const rawTools = await mcp.getTools();

    const wrappedTools = Object.fromEntries(
      Object.entries(rawTools).map(([name, tool]) => [
        name,
        {
          ...tool,
          execute: async (input: any) => {
            console.log(`🔧 [Tool: ${name}] Input:`, input);
            const result = await tool.execute(input);
            console.log(`✅ [Tool: ${name}] Output:`, result);
            return result;
          },
        },
      ])
    );

    const agent = new Agent({
      name: "Slack Agent",
      tools: wrappedTools,
      instructions: `
        Perplexityで最新ニュースを取ってきてください。
        10件程度でお願いします。
        エラーが出ないようにメッセージ構造を整えてください。
        Markdownは避け、Slackの\`\`\`で囲ってください。
        ニュースのリストは以下の内容でお願いします。

        - タイトル
        - 日付
        - サマリー (300文字程度)
        - URL込リンク

        出力はすべて日本語で。
        #askai_test に投稿してください。
      `,
      model: openai("gpt-4o-mini"),
    });

    const result = await agent.generate(topic);
  } catch (err) {
    console.error("❌ Failed prompt:", topic, err);
  }
}

async function main() {
  const topics = ["データセンター関連", "AI関連", "MCP関連"];

  for (const topic of topics) {
    await sendNews(topic);
  }

  await mcp.disconnect();
}

// Execute main
main().catch((err) => {
  console.error("❌ Unhandled error in main():", err);
});
