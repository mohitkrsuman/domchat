export type ParticipantRole = "viewer" | "contributor" | "owner";

export const participantUserSelect = { id: true, email: true, name: true } as const;

export function canSendMessages(role: ParticipantRole | null | undefined) {
  return role === "contributor" || role === "owner";
}

export function canRunAgent(role: ParticipantRole | null | undefined) {
  return canSendMessages(role);
}

export function isSessionOwner(role: ParticipantRole | null | undefined) {
  return role === "owner";
}

export function isParticipantRole(value: string): value is ParticipantRole {
  return value === "viewer" || value === "contributor" || value === "owner";
}
