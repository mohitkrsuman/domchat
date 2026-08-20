"use client";

import { useEffect, useRef } from "react";
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="card-dashed max-w-sm">
          <p>No events yet.</p>
          <p className="subtitle mt-1">Messages and joins will appear here for everyone.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollerRef} className="room-timeline-scroll">
      <ol className="timeline">
        {events.map((event) => {
          const isMessage = event.type === SESSION_EVENT_TYPES.messageUser;
          return (
            <li key={event.id} className="text-sm">
              <p className="text-xs muted">
                {new Date(event.createdAt).toLocaleTimeString()} · {actorLabel(event)}
              </p>
              <p className={isMessage ? "mt-1 whitespace-pre-wrap break-words" : "mt-1 muted"}>
                {eventCopy(event)}
              </p>
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
