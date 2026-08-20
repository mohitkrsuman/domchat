import { NextResponse } from "next/server";
import { getPrimaryWorkspace, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const membership = await getPrimaryWorkspace(user.id);

    if (!membership) {
      return NextResponse.json({ error: "Create a workspace first" }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, workspaceId: membership.workspaceId },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load incident" }, { status: 500 });
  }
}
