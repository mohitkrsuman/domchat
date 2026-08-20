import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { participantUserSelect } from "@/lib/session-roles";

export const sessionDetailInclude = {
  owner: { select: participantUserSelect },
  createdBy: { select: participantUserSelect },
  participants: {
    include: { user: { select: participantUserSelect } },
    orderBy: { joinedAt: "asc" as const },
  },
};

export async function loadWorkspaceSession(userId: string, sessionId: string) {
  const membership = await requireWorkspace(userId);
  const session = await prisma.session.findFirst({
    where: { id: sessionId, workspaceId: membership.workspaceId },
    include: sessionDetailInclude,
  });

  if (!session) {
    return { membership, session: null as null };
  }

  return { membership, session };
}
