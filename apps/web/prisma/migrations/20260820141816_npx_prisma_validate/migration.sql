/*
  Warnings:

  - You are about to drop the `incidents` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('on_call', 'feature', 'bug', 'testing', 'other');

-- CreateEnum
CREATE TYPE "SessionSeverity" AS ENUM ('sev1', 'sev2', 'sev3');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('open', 'active', 'blocked', 'resolved');

-- CreateEnum
CREATE TYPE "SessionParticipantRole" AS ENUM ('viewer', 'contributor', 'owner');

-- DropForeignKey
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_workspace_id_fkey";

-- DropTable
DROP TABLE "incidents";

-- DropEnum
DROP TYPE "IncidentSeverity";

-- DropEnum
DROP TYPE "IncidentStatus";

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'other',
    "severity" "SessionSeverity",
    "status" "SessionStatus" NOT NULL DEFAULT 'open',
    "repo_url" TEXT,
    "owner_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_participants" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SessionParticipantRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_participants_pkey" PRIMARY KEY ("session_id","user_id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_workspace_id_idx" ON "sessions"("workspace_id");

-- CreateIndex
CREATE INDEX "session_events_session_id_created_at_idx" ON "session_events"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
