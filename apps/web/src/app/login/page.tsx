"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AppChrome } from "@/components/app-chrome";
import { useToast } from "@/components/toast";
import { ButtonLoader, Skeleton } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/sessions";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      toast(signInError.message, "error");
      return;
    }

    toast("Signed in");
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          disabled={loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <ButtonLoader label="Signing in…" /> : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="page-narrow">
      <AppChrome />
      <p className="eyebrow">Phase 2 — Multiplayer</p>
      <h1 className="title">Sign in</h1>
      <p className="subtitle">
        No account?{" "}
        <Link href="/signup" className="link">
          Sign up
        </Link>
      </p>
      <Suspense
        fallback={
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
