"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  email: string;
  name: string | null;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user?.email) {
          toast("Could not load profile", "error");
          return;
        }
        setProfile({
          email: data.user.email,
          name:
            (data.user.user_metadata?.name as string | undefined) ??
            (data.user.user_metadata?.full_name as string | undefined) ??
            null,
        });
      } catch {
        toast("Could not load profile", "error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [toast]);

  return (
    <main className="page-app">
      <div className="mb-8">
        <p className="eyebrow">Account</p>
        <h1 className="title">Settings</h1>
        <p className="subtitle">Profile details for your DomChat account.</p>
      </div>

      <section className="card max-w-xl space-y-4 p-5">
        {loading ? (
          <p className="subtitle">Loading profile…</p>
        ) : profile ? (
          <>
            <div>
              <p className="label">Name</p>
              <p className="mt-1 text-sm">{profile.name || "Not set"}</p>
            </div>
            <div>
              <p className="label">Email</p>
              <p className="mt-1 text-sm">{profile.email}</p>
            </div>
            <p className="text-xs muted">
              Editing profile details will arrive in a later phase.
            </p>
          </>
        ) : (
          <p className="error-text">Profile unavailable.</p>
        )}
      </section>
    </main>
  );
}
