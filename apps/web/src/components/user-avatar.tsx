import { avatarHue, userInitials } from "@/lib/avatar";
import type { CSSProperties } from "react";

type AvatarTone = "user" | "self" | "agent" | "system";

export function UserAvatar({
  name,
  email,
  seed,
  tone = "user",
  size = "md",
}: {
  name?: string | null;
  email?: string | null;
  seed: string;
  tone?: AvatarTone;
  size?: "sm" | "md";
}) {
  const initials =
    tone === "agent" ? "AI" : tone === "system" ? "·" : userInitials(name, email);
  const hue = avatarHue(seed || email || name || "user");

  const style: CSSProperties | undefined =
    tone === "user" || tone === "self"
      ? ({ "--avatar-hue": String(hue) } as CSSProperties)
      : undefined;

  return (
    <span
      className={`user-avatar user-avatar-${size} user-avatar-${tone}`}
      style={style}
      aria-hidden
    >
      {initials}
    </span>
  );
}
