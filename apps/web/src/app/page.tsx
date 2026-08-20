import Link from "next/link";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/app-chrome";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  try {
    const user = await getSessionUser();
    if (user) {
      redirect("/incidents");
    }
  } catch {
    // Auth/DB unavailable — show landing page
  }

  return (
    <main className="page">
      <AppChrome />
      <header className="mt-16 max-w-xl">
        <p className="eyebrow">Phase 1 — Foundation</p>
        <h1 className="title text-4xl">DomChat</h1>
        <p className="subtitle mt-3 text-base">
          Multiplayer AI agent workspace. Sign in to create a workspace and start tracking
          engineering incidents.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary">
          Sign up
        </Link>
        <Link href="/login" className="btn-secondary">
          Sign in
        </Link>
      </div>
    </main>
  );
}
