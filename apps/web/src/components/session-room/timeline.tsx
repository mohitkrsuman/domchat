"use client";

import type { TimelineEvent } from "@/lib/realtime-protocol";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";

function actorLabel(event: TimelineEvent) {
  return event.actor?.name || event.actor?.email || "system";
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
    case SESSION_EVENT_TYPES.messageUser:
      return String(payload.text ?? "");
    case SESSION_EVENT_TYPES.roleChanged:
      return `set role of participant to ${String(payload.role ?? "")}`;
    default:
      return event.type;
  }
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="card-dashed">
        <p>No events yet.</p>
        <p className="subtitle mt-1">Messages and joins will appear here for everyone.</p>
      </div>
    );
  }

  return (
    <ol className="timeline card">
      {events.map((event) => {
        const isMessage = event.type === SESSION_EVENT_TYPES.messageUser;
        return (
          <li key={event.id} className="text-sm">
            <p className="text-xs muted">
              {new Date(event.createdAt).toLocaleTimeString()} · {actorLabel(event)}
            </p>
            <p className={isMessage ? "mt-1 whitespace-pre-wrap" : "mt-1 muted"}>
              {isMessage ? eventCopy(event) : eventCopy(event)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
