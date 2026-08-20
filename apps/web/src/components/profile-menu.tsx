"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type ProfileUser = {
  email: string;
  name: string | null;
};

function initials(user: ProfileUser) {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileMenu() {
  const router = useRouter();
  const { toast } = useToast();
  const generatedId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user?.email) return;
      setUser({
        email: data.user.email,
        name:
          (data.user.user_metadata?.name as string | undefined) ??
          (data.user.user_metadata?.full_name as string | undefined) ??
          null,
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast("Signed out");
      setOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      toast("Failed to sign out", "error");
      setSigningOut(false);
    }
  }

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            id={`${generatedId}-menu`}
            className="profile-menu"
            role="menu"
            style={{ top: position.top, right: position.right }}
          >
            <div className="profile-menu-header">
              <p className="truncate text-sm font-medium">{user?.name || "Account"}</p>
              <p className="truncate text-xs muted">{user?.email ?? "Loading…"}</p>
            </div>
            <Link
              href="/settings"
              role="menuitem"
              className="profile-menu-item"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              className="profile-menu-item"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Signing out…
                </span>
              ) : (
                "Sign out"
              )}
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${generatedId}-menu`}
        aria-label="Profile menu"
        onClick={() => {
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
              top: rect.bottom + 8,
              right: window.innerWidth - rect.right,
            });
          }
          setOpen((v) => !v);
        }}
      >
        <span className="profile-avatar">{user ? initials(user) : "…"}</span>
      </button>
      {menu}
    </>
  );
}
