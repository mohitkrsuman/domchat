import { AgentRunStatus, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { appendSessionEvent, publishRealtime } from "@/lib/session-events";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { streamChatCompletion, type LlmMessage } from "@/lib/llm";
import { AGENT_MAX_DURATION_MS, AGENT_MAX_STEPS } from "@/lib/agent/limits";
import { clearRunAbort, isRunAborted } from "@/lib/agent/queue";
import { AGENT_TOOLS, executeAgentTool, parseToolArgs, summarizeArgs } from "@/lib/agent/tools";

const RESULT_PREVIEW = 1200;

function preview(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= RESULT_PREVIEW) return trimmed;
  return `${trimmed.slice(0, RESULT_PREVIEW)}…`;
}

async function publishStatus(sessionId: string, runId: string, status: AgentRunStatus) {
  await publishRealtime(sessionId, { type: "run.status", runId, status });
}

async function markTerminal(input: {
  runId: string;
  sessionId: string;
  status: "stopped" | "completed" | "failed";
  error?: string;
  eventType: string;
  actorId?: string | null;
}) {
  const run = await prisma.agentRun.update({
    where: { id: input.runId },
    data: {
      status: input.status,
      error: input.error ?? null,
      endedAt: new Date(),
    },
  });

  await appendSessionEvent({
    sessionId: input.sessionId,
    type: input.eventType,
    actorId: input.actorId ?? null,
    payload: {
      runId: run.id,
      ...(input.error ? { error: input.error } : {}),
      ...(input.status === "stopped" ? { reason: "user_stop" } : {}),
    },
  });
  await publishStatus(input.sessionId, run.id, run.status);
  await clearRunAbort(run.id);
  return run;
}

function buildUserPrompt(input: {
  title: string;
  type: string;
  severity: string | null;
  repoUrl: string | null;
  prompt: string | null;
  contexts: Array<{ kind: string; content: string }>;
  messages: string[];
}) {
  const defaultPrompt =
    "Investigate this session using the attached context and repository. Identify the likely root cause. Use read_file and search_repo when a GitHub repo is available.";
  const sections = [
    `Session: ${input.title}`,
    `Type: ${input.type}`,
    input.severity ? `Severity: ${input.severity}` : null,
    `Repo: ${input.repoUrl ?? "(none)"}`,
    "",
    input.prompt?.trim() || defaultPrompt,
  ];

  if (input.contexts.length > 0) {
    sections.push("", "Attached context:");
    for (const ctx of input.contexts) {
      sections.push(`--- ${ctx.kind} ---\n${ctx.content.slice(0, 12_000)}`);
    }
  }

  if (input.messages.length > 0) {
    sections.push("", "Recent room messages:");
    sections.push(input.messages.join("\n"));
  }

  return sections.filter((line) => line !== null).join("\n");
}

export async function runAgentJob(runId: string, sessionId: string) {
  const run = await prisma.agentRun.findUnique({ where: { id: runId } });
  if (!run || run.sessionId !== sessionId) return;
  if (run.status === "stopped") return;

  if (await isRunAborted(runId)) {
    await markTerminal({
      runId,
      sessionId,
      status: "stopped",
      eventType: SESSION_EVENT_TYPES.runStopped,
      actorId: run.requestedById,
    });
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      contexts: { orderBy: { createdAt: "asc" }, take: 20 },
      events: {
        where: { type: SESSION_EVENT_TYPES.messageUser },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!session) {
    await markTerminal({
      runId,
      sessionId,
      status: "failed",
      error: "Session not found",
      eventType: SESSION_EVENT_TYPES.runFailed,
    });
    return;
  }

  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: run.startedAt ?? new Date(), error: null },
  });
  await publishStatus(sessionId, runId, "running");

  const startedAt = Date.now();
  const recentMessages = [...session.events].reverse().map((event) => {
    const payload = event.payload as { text?: string };
    return `- ${String(payload.text ?? "").slice(0, 500)}`;
  });

  const messages: LlmMessage[] = [
    {
      role: "system",
      content: [
        "You are DomChat's investigation agent in a shared multiplayer session.",
        "Work from the session title, repo, pasted context, and recent messages.",
        "Use read_file and search_repo to inspect the public GitHub repository when a repo is available.",
        "Be concise and specific. Do not claim to have applied code changes.",
        "Stop when you have a likely root cause or have exhausted useful investigation.",
      ].join(" "),
    },
    {
      role: "user",
      content: buildUserPrompt({
        title: session.title,
        type: session.type,
        severity: session.severity,
        repoUrl: session.repoUrl,
        prompt: run.prompt,
        contexts: session.contexts,
        messages: recentMessages,
      }),
    },
  ];

  try {
    for (let step = 1; step <= AGENT_MAX_STEPS; step++) {
      if (await isRunAborted(runId)) {
        await markTerminal({
          runId,
          sessionId,
          status: "stopped",
          eventType: SESSION_EVENT_TYPES.runStopped,
          actorId: run.requestedById,
        });
        return;
      }
      if (Date.now() - startedAt > AGENT_MAX_DURATION_MS) {
        await markTerminal({
          runId,
          sessionId,
          status: "failed",
          error: `Run exceeded ${Math.round(AGENT_MAX_DURATION_MS / 60000)} minute limit`,
          eventType: SESSION_EVENT_TYPES.runFailed,
        });
        return;
      }

      const current = await prisma.agentRun.findUnique({ where: { id: runId }, select: { status: true } });
      if (!current || current.status === "stopped") return;

      const { content, toolCalls } = await streamChatCompletion({
        messages,
        tools: AGENT_TOOLS,
        onDelta: async (text) => {
          await publishRealtime(sessionId, { type: "run.delta", runId, text });
        },
      });

      if (content.trim()) {
        await appendSessionEvent({
          sessionId,
          type: SESSION_EVENT_TYPES.messageAgent,
          payload: { text: content, runId },
        });
      }

      if (toolCalls.length === 0) {
        await markTerminal({
          runId,
          sessionId,
          status: "completed",
          eventType: SESSION_EVENT_TYPES.runCompleted,
        });
        return;
      }

      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      });

      for (const call of toolCalls) {
        if (await isRunAborted(runId)) {
          await markTerminal({
            runId,
            sessionId,
            status: "stopped",
            eventType: SESSION_EVENT_TYPES.runStopped,
            actorId: run.requestedById,
          });
          return;
        }

        const args = parseToolArgs(call.arguments);
        await appendSessionEvent({
          sessionId,
          type: SESSION_EVENT_TYPES.toolCall,
          payload: {
            runId,
            toolName: call.name,
            args: summarizeArgs(args),
          } as Prisma.InputJsonValue,
        });

        const result = await executeAgentTool(call.name, args, session.repoUrl);
        await appendSessionEvent({
          sessionId,
          type: SESSION_EVENT_TYPES.toolResult,
          payload: { runId, toolName: call.name, result: preview(result) },
        });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    await markTerminal({
      runId,
      sessionId,
      status: "failed",
      error: `Run hit max ${AGENT_MAX_STEPS} steps`,
      eventType: SESSION_EVENT_TYPES.runFailed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent run failed";
    const latest = await prisma.agentRun.findUnique({ where: { id: runId }, select: { status: true } });
    if (latest?.status === "stopped") return;
    await markTerminal({
      runId,
      sessionId,
      status: "failed",
      error: message.slice(0, 1000),
      eventType: SESSION_EVENT_TYPES.runFailed,
    });
  }
}
