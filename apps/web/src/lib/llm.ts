export type LlmConfig = {
  url: string;
  key: string;
  model: string;
  extraHeaders: Record<string, string>;
};

export type LlmToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type LlmMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export type LlmTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function getLlmConfig(): LlmConfig | null {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openrouterKey) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: openrouterKey,
      model: process.env.LLM_MODEL ?? "openai/gpt-4o-mini",
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
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      extraHeaders: {},
    };
  }

  return null;
}

export async function streamChatCompletion(input: {
  messages: LlmMessage[];
  tools?: LlmTool[];
  onDelta?: (text: string) => void | Promise<void>;
}): Promise<{ content: string; toolCalls: LlmToolCall[] }> {
  const config = getLlmConfig();
  if (!config) {
    throw new Error("Set OPENROUTER_API_KEY or OPENAI_API_KEY in .env");
  }

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
      messages: input.messages,
      ...(input.tools && input.tools.length > 0 ? { tools: input.tools, tool_choice: "auto" } : {}),
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    throw new Error(`LLM upstream error: ${text.slice(0, 800)}`);
  }

  const reader = upstream.body?.getReader();
  if (!reader) {
    throw new Error("LLM stream missing body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolAcc = new Map<number, { id: string; name: string; arguments: string }>();

  const flushSse = async (chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;

    let parsed: {
      choices?: Array<{
        delta?: {
          content?: string;
          tool_calls?: Array<{
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    const delta = parsed.choices?.[0]?.delta;
    if (!delta) return;

    if (delta.content) {
      content += delta.content;
      await input.onDelta?.(delta.content);
    }

    for (const call of delta.tool_calls ?? []) {
      const index = call.index ?? 0;
      const existing = toolAcc.get(index) ?? { id: "", name: "", arguments: "" };
      if (call.id) existing.id = call.id;
      if (call.function?.name) existing.name += call.function.name;
      if (call.function?.arguments) existing.arguments += call.function.arguments;
      toolAcc.set(index, existing);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        await flushSse(line);
      }
    }
    if (buffer.trim()) await flushSse(buffer);
  } finally {
    reader.releaseLock();
  }

  const toolCalls = [...toolAcc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, call]) => ({
      id: call.id || `tool_${Math.random().toString(36).slice(2, 10)}`,
      name: call.name,
      arguments: call.arguments,
    }))
    .filter((call) => call.name);

  return { content, toolCalls };
}
