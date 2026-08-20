"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme";

export function AppChrome({
  children,
  showBrand = true,
}: {
  children?: React.ReactNode;
  showBrand?: boolean;
}) {
  return (
    <div className="app-header">
      {showBrand ? (
        <Link href="/" className="brand">
          DOOMCHAT
        </Link>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </div>
  );
}
