export const SESSION_TYPES = ["on_call", "feature", "bug", "testing", "other"] as const;
export const SESSION_SEVERITIES = ["sev1", "sev2", "sev3"] as const;
export const SESSION_STATUSES = ["open", "active", "blocked", "resolved"] as const;

export type SessionTypeValue = (typeof SESSION_TYPES)[number];
export type SessionSeverityValue = (typeof SESSION_SEVERITIES)[number];
export type SessionStatusValue = (typeof SESSION_STATUSES)[number];

export const SESSION_TYPE_LABELS: Record<SessionTypeValue, string> = {
  on_call: "On-call",
  feature: "Feature",
  bug: "Bug",
  testing: "Testing",
  other: "Other",
};

export function isSessionType(value: string): value is SessionTypeValue {
  return (SESSION_TYPES as readonly string[]).includes(value);
}

export function isSessionSeverity(value: string): value is SessionSeverityValue {
  return (SESSION_SEVERITIES as readonly string[]).includes(value);
}

export function isSessionStatus(value: string): value is SessionStatusValue {
  return (SESSION_STATUSES as readonly string[]).includes(value);
}
