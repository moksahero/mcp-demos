import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await fetch("http://152.42.218.231:4000/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const contentType = response.headers.get("content-type");

    console.log(response);

    if (contentType?.includes("application/json")) {
      const data = await response.json();
      return res.status(200).json(data);
    } else {
      const text = await response.text();
      console.warn("⚠️ Non-JSON response received:", text.slice(0, 200));
      return res.status(502).json({
        error: "Expected JSON but received HTML or plain text",
        raw: text,
      });
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch from external server" });
  }
}
