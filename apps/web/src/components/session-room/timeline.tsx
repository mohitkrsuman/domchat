"use client";

import { useEffect, useRef } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { TimelineEvent } from "@/lib/realtime-protocol";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";

function actorLabel(event: TimelineEvent) {
  return event.actor?.name || event.actor?.email || "Someone";
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
      return String(payload.text ?? "");
    case SESSION_EVENT_TYPES.roleChanged:
      return `set role of participant to ${String(payload.role ?? "")}`;
    default:
      if (event.type === "message.agent") {
        return String(payload.text ?? "");
      }
      return event.type;
  }
}

function isChatMessage(event: TimelineEvent) {
  return event.type === SESSION_EVENT_TYPES.messageUser || event.type === "message.agent";
}

export function Timeline({
  events,
  currentUserId,
}: {
  events: TimelineEvent[];
  currentUserId: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="card-dashed max-w-sm">
          <p>No messages yet.</p>
          <p className="subtitle mt-1">Your notes and teammate chat show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollerRef} className="room-timeline-scroll">
      <ol className="timeline">
        {events.map((event) => {
          if (!isChatMessage(event)) {
            return (
              <li key={event.id} className="timeline-system">
                <span className="timeline-system-dot" aria-hidden />
                <p>
                  <span className="font-medium">{actorLabel(event)}</span> {eventCopy(event)}
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

          const isAgent = event.type === "message.agent";
          const isSelf = !isAgent && Boolean(currentUserId) && event.actorId === currentUserId;
          const label = isAgent ? "Agent" : isSelf ? "You" : actorLabel(event);
          const seed = event.actorId || event.actor?.email || event.id;

          return (
            <li
              key={event.id}
              className={`timeline-msg${isSelf ? " is-self" : ""}${isAgent ? " is-agent" : ""}`}
            >
              <UserAvatar
                name={event.actor?.name}
                email={event.actor?.email}
                seed={isAgent ? "agent" : seed}
                tone={isAgent ? "agent" : isSelf ? "self" : "user"}
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
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
