import express from "express";
import bodyParser from "body-parser";
import type { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import defineAgent from "@mastra/core";
import { MCPClient } from "@mastra/mcp";
import { z } from "zod";
dotenv.config();

const schema = z.object({
  summary: z.string(),
  content: z.string(),
});

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

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
      playwright: {
        command: "npx",
        args: ["@playwright/mcp"],
      },
    },
  });

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  app.use(bodyParser.urlencoded({ extended: true }));

  app.post("/api/ask", async (req: Request, res: Response) => {
    console.log("📥 Raw incoming body:", req.body);

    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode is in the query string of the request
    if (mode && token) {
      // Check the mode and token sent is correct
      if (mode === "subscribe" && token === process.env.FB_WEBHOOK_TOKEN) {
        // Respond with the challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        // Respond with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  });
}

/*
    if (req.query["hub.verify_token"] === process.env.FB_WEBHOOK_TOKEN) {
      res.status(200).send(challenge);
    }

    const { text, response_url } = req.body;
    const prompt = text;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
    }

    res.status(200).send();

    const promptHeader =
      "```\nプロンプト： /askai " + prompt + "\n\n AIに問い合わせ中...\n```";

    await fetch(response_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "in_channel",
        text: promptHeader,
      }),
    });

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
        name: "Slack Agent",
        tools: wrappedTools,
        instructions: `
        Playwrightを使って指定のURLを解析できます
        Perplexityで調べものもできます
        Perplexityにリクエストを送るときは以下のエラーが出ないようにメッセージの構造をきれいにしてください
        '{"error":{"message":"Last message must have role \`user\`.","type":"invalid_message","code":400}}'
        '{"error":{"message":"After the (optional) system message(s), user and assistant roles should be alternating.","type":"invalid_message","code":400}}'
        Markdownフォーマットは使わず、Slackの\`\`\`にきれいに入るフラットテキストで出してください。
        最後の出力はこのプロンプトで何を送ったか詳細を送ってください
        全部日本語で出力してください
        `,
        model: openai("gpt-4o-mini"),
      });

      const response = await agent.generate(prompt);

      const resultText = "```\n" + response.text + "\n```";

      await fetch(response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_type: "in_channel",
          text: resultText,
        }),
      });
    } catch (err) {
      res.json(err);
      console.error(err);
      res.status(500).json({ error: "Error generating response" });

      await fetch(response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_type: "in_channel",
          text: err,
        }),
      });
    } finally {
      // 接続を明示的に終了
      console.log("Disconnecting from MCP...");
      await mcp.disconnect();
    }
  });

  app.listen(4000, () => {
    console.log("✅ Express API server is running on http://localhost:4000");
  });
}
  */

// Call main()
main().catch((err) => {
  console.error("❌ Failed to start server:", err);
});
