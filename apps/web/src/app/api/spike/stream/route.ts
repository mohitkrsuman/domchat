import { NextRequest } from "next/server";

export const runtime = "nodejs";

function getApiConfig():
  | { url: string; key: string; model: string; extraHeaders: Record<string, string> }
  | null {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openrouterKey) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: openrouterKey,
      model: "openai/gpt-4o-mini",
      extraHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "DomChat",
      },
    };
  }

  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: "gpt-4o-mini",
      extraHeaders: {},
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const config = getApiConfig();
  if (!config) {
    return Response.json(
      { error: "Set OPENROUTER_API_KEY or OPENAI_API_KEY in .env" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const prompt = typeof body.prompt === "string" ? body.prompt : "Hello from DomChat.";

  const upstream = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.key}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [
        { role: "system", content: "You are a helpful assistant for DomChat setup verification." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return Response.json({ error: `LLM upstream error: ${text}` }, { status: 502 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(new TextEncoder().encode(token));
            } catch {
              // skip malformed SSE chunks
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
