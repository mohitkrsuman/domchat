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
}: {
  participants: Participant[];
  presence: PresenceUser[];
  currentUserId: string | null;
  isOwner: boolean;
  onChangeRole: (userId: string, role: "viewer" | "contributor") => void;
  changingUserId: string | null;
}) {
  const onlineIds = new Set(presence.map((u) => u.id));

  return (
    <aside className="card p-4">
      <h2 className="text-sm font-medium">Participants</h2>
      <p className="subtitle mt-1">{onlineIds.size} in the room</p>
      <ul className="mt-4 space-y-3">
        {participants.map((p) => {
          const online = onlineIds.has(p.userId);
          const label = p.user.name || p.user.email;
          const canEdit = isOwner && p.role !== "owner" && p.userId !== currentUserId;
          return (
            <li key={p.userId} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {label}
                    {p.userId === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="text-xs muted">{online ? "online" : "offline"}</p>
                </div>
                {!canEdit && <span className="badge">{p.role}</span>}
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
