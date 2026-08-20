"use client";

import type { PresenceUser } from "@/lib/realtime-protocol";
import { ButtonLoader } from "@/components/ui";

type Participant = {
  userId: string;
  role: "viewer" | "contributor" | "owner";
  user: { id: string; email: string; name: string | null };
};

export function PresencePanel({
  participants,
  presence,
  currentUserId,
  isOwner,
  onChangeRole,
  changingUserId,
  realtimeStatus = "offline",
}: {
  participants: Participant[];
  presence: PresenceUser[];
  currentUserId: string | null;
  isOwner: boolean;
  onChangeRole: (userId: string, role: "viewer" | "contributor") => void;
  changingUserId: string | null;
  realtimeStatus?: "connecting" | "live" | "offline";
}) {
  const onlineIds = new Set(presence.map((u) => u.id));
  const liveLabel =
    realtimeStatus === "live"
      ? "Live"
      : realtimeStatus === "connecting"
        ? "Connecting…"
        : "Offline — run npm run dev:realtime";

  return (
    <aside className="room-sidebar card">
      <div className="room-sidebar-header">
        <h2 className="text-sm font-medium">Participants</h2>
        <p className="subtitle mt-1">
          {onlineIds.size} in the room · {liveLabel}
        </p>
      </div>
      <ul className="room-sidebar-list">
        {participants.map((p) => {
          const online = onlineIds.has(p.userId);
          const label = p.user.name || p.user.email;
          const canEdit = isOwner && p.role !== "owner" && p.userId !== currentUserId;
          return (
            <li key={p.userId} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {label}
                    {p.userId === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="text-xs muted">{online ? "online" : "offline"}</p>
                </div>
                {!canEdit && <span className="badge shrink-0">{p.role}</span>}
              </div>
              {canEdit && (
                <div className="mt-2">
                  <label className="label" htmlFor={`role-${p.userId}`}>
                    Role
                  </label>
                  <select
                    id={`role-${p.userId}`}
                    className="input"
                    disabled={changingUserId === p.userId}
                    value={p.role}
                    onChange={(e) => {
                      onChangeRole(p.userId, e.target.value as "viewer" | "contributor");
                    }}
                  >
                    <option value="contributor">contributor</option>
                    <option value="viewer">viewer</option>
                  </select>
                  {changingUserId === p.userId && (
                    <p className="mt-1 text-xs muted">
                      <ButtonLoader label="Updating…" />
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
