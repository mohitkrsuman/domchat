import { prisma } from "@/lib/db";
import { participantUserSelect } from "@/lib/session-roles";

export const sessionDetailInclude = {
  owner: { select: participantUserSelect },
  createdBy: { select: participantUserSelect },
  participants: {
    include: { user: { select: participantUserSelect } },
    orderBy: { joinedAt: "asc" as const },
  },
};

export type SessionAccessResult =
  | {
      ok: true;
      session: NonNullable<Awaited<ReturnType<typeof findSessionById>>>;
      membership: NonNullable<Awaited<ReturnType<typeof findMembership>>>;
    }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN_WORKSPACE" };

async function findSessionById(sessionId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId },
    include: sessionDetailInclude,
  });
}

async function findMembership(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
}

/**
 * Load a session if the user is a member of that session's workspace.
 * Share-link join must not depend on the user's "primary" workspace only.
 */
export async function loadWorkspaceSession(
  userId: string,
  sessionId: string
): Promise<SessionAccessResult> {
  const session = await findSessionById(sessionId);
  if (!session) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const membership = await findMembership(userId, session.workspaceId);
  if (!membership) {
    return { ok: false, code: "FORBIDDEN_WORKSPACE" };
  }

  return { ok: true, session, membership };
}

export function sessionAccessError(result: Extract<SessionAccessResult, { ok: false }>) {
  if (result.code === "FORBIDDEN_WORKSPACE") {
    return {
      body: {
        error: "You are not a member of this session’s workspace. Ask a workspace admin to invite you.",
        code: "FORBIDDEN_WORKSPACE",
      },
      status: 403,
    };
  }
  return { body: { error: "Not found", code: "NOT_FOUND" }, status: 404 };
}
