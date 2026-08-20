export const SESSION_EVENT_TYPES = {
  sessionCreated: "session.created",
  participantJoined: "participant.joined",
  participantLeft: "participant.left",
  messageUser: "message.user",
  roleChanged: "participant.role_changed",
} as const;

export type SessionEventType =
  (typeof SESSION_EVENT_TYPES)[keyof typeof SESSION_EVENT_TYPES];

export type TimelineEvent = {
  id: string;
  sessionId: string;
  type: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  actor?: { id: string; email: string; name: string | null } | null;
};

export type PresenceUser = {
  id: string;
  name: string | null;
  email: string;
  role: "viewer" | "contributor" | "owner";
};

export type ClientToServer =
  | { type: "join"; sessionId: string; token: string }
  | { type: "leave"; sessionId: string }
  | { type: "presence.ping" };

export type ServerToClient =
  | { type: "presence.update"; users: PresenceUser[] }
  | { type: "event.append"; event: TimelineEvent }
  | { type: "error"; code: string; message: string };

export function sessionChannel(sessionId: string) {
  return `session:${sessionId}`;
}

export function asTimelineEvent(event: {
  id: string;
  sessionId: string;
  type: string;
  actorId: string | null;
  payload: unknown;
  createdAt: Date;
  actor?: { id: string; email: string; name: string | null } | null;
}): TimelineEvent {
  const payload =
    event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? (event.payload as Record<string, unknown>)
      : {};

  return {
    id: event.id,
    sessionId: event.sessionId,
    type: event.type,
    actorId: event.actorId,
    payload,
    createdAt: event.createdAt.toISOString(),
    actor: event.actor ?? null,
  };
}
