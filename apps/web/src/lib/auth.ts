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

export async function requireWorkspace(userId: string) {
  const membership = await getPrimaryWorkspace(userId);
  if (!membership) {
    throw new Error("NO_WORKSPACE");
  }
  return membership;
}

export function jsonError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return { body: { error: "Unauthorized" }, status: 401 };
    }
    if (error.message === "NO_WORKSPACE") {
      return { body: { error: "Create a workspace first" }, status: 400 };
    }
    if (error.message === "FORBIDDEN") {
      return { body: { error: "Forbidden" }, status: 403 };
    }
  }
  return { body: { error: fallback }, status: 500 };
}
