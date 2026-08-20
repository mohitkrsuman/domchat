import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
};

export async function getSessionUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const localUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: {
      email: user.email,
      name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? undefined,
    },
    create: {
      supabaseId: user.id,
      email: user.email,
      name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
    },
  });

  return {
    id: localUser.id,
    supabaseId: localUser.supabaseId,
    email: localUser.email,
    name: localUser.name,
  };
}

export async function requireUser(): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function getPrimaryWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return membership;
}
