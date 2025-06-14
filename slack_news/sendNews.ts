import dotenv from "dotenv";
dotenv.config({ path: "/home/ta/mcp-demos/slack_news/.env" });

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
      あなたは2つのツール（PerplexityとSlack）を使えるエージェントです。

      以下のプロセスに従ってください：
      
      1. トピック（例: "AI関連"）を使って、Perplexityツールを呼び出し、ここ３日以内に公開されたニュースを10件取得してください。
      2. 各ニュースについて以下のフォーマットで整形してください：
      
      \`\`\`
      【トピック名】
      (いつからいつまでのニュースかを 「yyyy-mm-dd ~ yyyy-mm-dd のニュース」形式で記載してください。)
      
      1. タイトル
      日付: YYYY-MM-DD
      サマリー: （500文字程度）
      リンク: https://... (記事に直接飛べるリンク)
      
      \`\`\`
      
      3. Markdownは使わず、Slackの \`\`\` で囲んでください。
      4. 取得したニュース一覧を Slack の #00_news チャンネルに投稿してください。
      5. 日付は記事の公開された年月日を入れてください
      6. リンク先は記事に飛べるディープリンクにしてください
      7. 出力はすべて日本語で書いてください。
      8. 出力する前にもう一度全て\`\`\`で始まり、\`\`\`で終わることを確認して出力してください。
      9. 出力は必ず1つのコードブロックで囲んでください。  
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
