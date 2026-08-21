"use client";

import { useEffect, useRef } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { TimelineEvent } from "@/lib/realtime-protocol";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";

function actorLabel(event: TimelineEvent) {
  return event.actor?.name || event.actor?.email || "Someone";
}

function payloadText(event: TimelineEvent) {
  return String(event.payload.text ?? "");
}

function eventCopy(event: TimelineEvent) {
  const payload = event.payload;
  switch (event.type) {
    case SESSION_EVENT_TYPES.sessionCreated:
      return `created session${payload.title ? ` “${String(payload.title)}”` : ""}`;
    case SESSION_EVENT_TYPES.participantJoined:
      return `joined as ${String(payload.role ?? "contributor")}`;
    case SESSION_EVENT_TYPES.participantLeft:
      return "left the room";
    case SESSION_EVENT_TYPES.participantRemoved:
      return `removed ${String(payload.name || payload.email || "a participant")} from the session`;
    case SESSION_EVENT_TYPES.messageUser:
      return payloadText(event);
    case SESSION_EVENT_TYPES.roleChanged:
      return `set role of participant to ${String(payload.role ?? "")}`;
    case SESSION_EVENT_TYPES.runStarted:
      return "started an agent run";
    case SESSION_EVENT_TYPES.runStopped:
      return "stopped the agent run";
    case SESSION_EVENT_TYPES.runCompleted:
      return "agent run completed";
    case SESSION_EVENT_TYPES.runFailed:
      return `agent run failed${payload.error ? `: ${String(payload.error)}` : ""}`;
    case SESSION_EVENT_TYPES.contextAdded:
      return `added ${String(payload.kind ?? "context")}`;
    case SESSION_EVENT_TYPES.toolCall:
      return `called ${String(payload.toolName ?? "tool")}`;
    case SESSION_EVENT_TYPES.toolResult:
      return `${String(payload.toolName ?? "tool")} result`;
    default:
      return event.type;
  }
}

function isChatMessage(event: TimelineEvent) {
  return event.type === SESSION_EVENT_TYPES.messageUser || event.type === SESSION_EVENT_TYPES.messageAgent;
}

function argsSummary(payload: Record<string, unknown>) {
  const args = payload.args;
  if (!args || typeof args !== "object") return "";
  return Object.entries(args as Record<string, unknown>)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 80)}`)
    .join(", ");
}

type TimelineItem =
  | { kind: "event"; event: TimelineEvent }
  | { kind: "agent"; runId: string; text: string; event: TimelineEvent };

function groupEvents(events: TimelineEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const event of events) {
    if (event.type !== SESSION_EVENT_TYPES.messageAgent) {
      items.push({ kind: "event", event });
      continue;
    }
    const runId = String(event.payload.runId ?? event.id);
    const text = payloadText(event);
    const last = items[items.length - 1];
    if (last?.kind === "agent" && last.runId === runId) {
      last.text = `${last.text}${text}`;
      last.event = event;
    } else {
      items.push({ kind: "agent", runId, text, event });
    }
  }
  return items;
}

function AgentBubble({
  text,
  time,
  streaming,
}: {
  text: string;
  time?: string;
  streaming?: boolean;
}) {
  return (
    <li className="timeline-msg is-agent">
      <UserAvatar name="Agent" email="agent@domchat" seed="agent" tone="agent" />
      <div className="timeline-msg-body">
        <div className="timeline-msg-meta">
          <span className="timeline-msg-name">Agent</span>
          {time ? <span className="timeline-msg-time">{time}</span> : null}
          {streaming ? <span className="timeline-msg-time">streaming</span> : null}
        </div>
        <div className="timeline-msg-bubble">
          {text || (streaming ? "…" : "")}
        </div>
      </div>
    </li>
  );
}

export function Timeline({
  events,
  currentUserId,
  live,
}: {
  events: TimelineEvent[];
  currentUserId: string | null;
  live?: { runId: string; text: string } | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length, live?.text]);

  const items = groupEvents(events);
  const empty = items.length === 0 && !live?.text;

  if (empty) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="card-dashed max-w-sm">
          <p>No messages yet.</p>
          <p className="subtitle mt-1">Chat, paste context, or start the agent to investigate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-timeline-scroll">
      <ol className="timeline">
        {items.map((item) => {
          if (item.kind === "agent") {
            return (
              <AgentBubble
                key={item.event.id}
                text={item.text}
                time={new Date(item.event.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
            );
          }

          const event = item.event;
          if (event.type === SESSION_EVENT_TYPES.toolCall || event.type === SESSION_EVENT_TYPES.toolResult) {
            const isCall = event.type === SESSION_EVENT_TYPES.toolCall;
            const detail = isCall ? argsSummary(event.payload) : String(event.payload.result ?? "");
            return (
              <li key={event.id} className="timeline-tool">
                <span className="timeline-tool-label">{isCall ? "tool" : "result"}</span>
                <div className="min-w-0 flex-1">
                  <p className="timeline-tool-name">{String(event.payload.toolName ?? "tool")}</p>
                  {detail ? <p className="timeline-tool-detail">{detail}</p> : null}
                </div>
              </li>
            );
          }

          if (!isChatMessage(event)) {
            return (
              <li key={event.id} className="timeline-system">
                <span className="timeline-system-dot" aria-hidden />
                <p>
                  <span className="font-medium">
                    {event.actor ? actorLabel(event) : event.type.startsWith("run.") || event.type.startsWith("tool.") ? "Agent" : actorLabel(event)}
                  </span>{" "}
                  {eventCopy(event)}
                  <span className="timeline-system-time">
                    {" · "}
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
              </li>
            );
          }

          const isSelf = Boolean(currentUserId) && event.actorId === currentUserId;
          const label = isSelf ? "You" : actorLabel(event);
          const seed = event.actorId || event.actor?.email || event.id;

          return (
            <li key={event.id} className={`timeline-msg${isSelf ? " is-self" : ""}`}>
              <UserAvatar
                name={event.actor?.name}
                email={event.actor?.email}
                seed={seed}
                tone={isSelf ? "self" : "user"}
              />
              <div className="timeline-msg-body">
                <div className="timeline-msg-meta">
                  <span className="timeline-msg-name">{label}</span>
                  <span className="timeline-msg-time">
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="timeline-msg-bubble">{eventCopy(event)}</div>
              </div>
            </li>
          );
        })}
        {live?.text ? <AgentBubble key={`live-${live.runId}`} text={live.text} streaming /> : null}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
