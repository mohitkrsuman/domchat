"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppChrome } from "@/components/app-chrome";
import { useToast } from "@/components/toast";
import { ButtonLoader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (signUpError) {
      setLoading(false);
      const alreadyRegistered =
        signUpError.message.toLowerCase().includes("already registered") ||
        signUpError.message.toLowerCase().includes("already been registered") ||
        signUpError.code === "user_already_exists";
      const msg = alreadyRegistered
        ? "An account with this email already exists. Please sign in."
        : signUpError.message;
      setError(msg);
      toast(msg, "error");
      return;
    }

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setLoading(false);
      const msg = "An account with this email already exists. Please sign in.";
      setError(msg);
      toast(msg, "error");
      return;
    }

    if (data.session) {
      toast("Account created");
      router.push("/workspace");
      router.refresh();
      return;
    }

    setLoading(false);
    toast("Check your email to confirm, then sign in");
  }

  return (
    <main className="page-narrow">
      <AppChrome />
      <p className="eyebrow">Phase 2 — Multiplayer</p>
      <h1 className="title">Create account</h1>
      <p className="subtitle">
        Already have an account?{" "}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>
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
          {loading ? <ButtonLoader label="Creating…" /> : "Sign up"}
        </button>
      </form>
    </main>
  );
}
