"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import { UserAvatar } from "@/components/user-avatar";
import type { PresenceUser } from "@/lib/realtime-protocol";
import { ButtonLoader } from "@/components/ui";

type Participant = {
  userId: string;
  role: "viewer" | "contributor" | "owner";
  user: { id: string; email: string; name: string | null };
};

const ROLE_OPTIONS = [
  {
    value: "contributor" as const,
    label: "Contributor",
    description: "Can send messages",
  },
  {
    value: "viewer" as const,
    label: "Viewer",
    description: "Read-only in this room",
  },
];

export function PresencePanel({
  participants,
  presence,
  currentUserId,
  isOwner,
  onChangeRole,
  onKick,
  changingUserId,
  kickingUserId,
  realtimeStatus = "offline",
}: {
  participants: Participant[];
  presence: PresenceUser[];
  currentUserId: string | null;
  isOwner: boolean;
  onChangeRole: (userId: string, role: "viewer" | "contributor") => void;
  onKick: (userId: string) => void;
  changingUserId: string | null;
  kickingUserId: string | null;
  realtimeStatus?: "connecting" | "live" | "offline";
}) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const onlineIds = new Set(presence.map((u) => u.id));
  const liveLabel =
    realtimeStatus === "live"
      ? "Live"
      : realtimeStatus === "connecting"
        ? "Connecting…"
        : "Offline — run npm run dev:realtime";

  return (
    <aside className="room-sidebar">
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
          const canManage = isOwner && p.role !== "owner" && p.userId !== currentUserId;
          const busy = changingUserId === p.userId || kickingUserId === p.userId;
          const manageOpen = openUserId === p.userId;

          return (
            <li key={p.userId} className="participant-row text-sm">
              <div className="flex items-center gap-2">
                <UserAvatar
                  name={p.user.name}
                  email={p.user.email}
                  seed={p.userId}
                  tone={p.userId === currentUserId ? "self" : "user"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {label}
                    {p.userId === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="text-xs muted">
                    <span className={online ? "text-[color:var(--success)]" : ""}>
                      {online ? "online" : "offline"}
                    </span>
                    {" · "}
                    <span className="capitalize">{p.role}</span>
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="participant-manage-toggle"
                    aria-expanded={manageOpen}
                    aria-controls={`manage-${p.userId}`}
                    disabled={busy}
                    onClick={() => setOpenUserId((id) => (id === p.userId ? null : p.userId))}
                  >
                    {manageOpen ? "Close" : "Manage"}
                  </button>
                ) : null}
              </div>

              {canManage && manageOpen && (
                <div id={`manage-${p.userId}`} className="participant-manage-panel">
                  <CustomSelect
                    id={`role-${p.userId}`}
                    label="Access"
                    value={p.role === "owner" ? "contributor" : p.role}
                    options={ROLE_OPTIONS}
                    disabled={busy}
                    onChange={(role) => onChangeRole(p.userId, role)}
                  />
                  {changingUserId === p.userId && (
                    <p className="text-xs muted">
                      <ButtonLoader label="Updating…" />
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    disabled={busy}
                    onClick={() => onKick(p.userId)}
                  >
                    {kickingUserId === p.userId ? <ButtonLoader label="Removing…" /> : "Remove"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
