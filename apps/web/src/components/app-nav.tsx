"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme";
import { ProfileMenu } from "@/components/profile-menu";

const links = [
  { href: "/sessions", label: "Sessions", match: (path: string) => path === "/sessions" },
  { href: "/workspace", label: "Workspace", match: (path: string) => path.startsWith("/workspace") },
  { href: "/sessions/join", label: "Join", match: (path: string) => path.startsWith("/sessions/join") },
  { href: "/sessions/new", label: "New session", match: (path: string) => path.startsWith("/sessions/new"), primary: true },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href="/sessions" className="brand">
          DOOMCHAT
        </Link>

        <nav className="app-nav-links" aria-label="Primary">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "primary" in link && link.primary
                    ? "btn-primary h-9 px-3 text-xs sm:text-sm"
                    : `app-nav-link${active ? " is-active" : ""}`
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="app-nav-actions">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
