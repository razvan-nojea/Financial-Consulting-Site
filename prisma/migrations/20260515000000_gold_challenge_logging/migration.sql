-- Gold Challenge: enhanced logging infrastructure
-- Adds sessionId to logs, and triggeredRules + updatedAt to suspicious_users.

-- AlterTable: logs — add nullable sessionId column and index
ALTER TABLE "logs" ADD COLUMN "sessionId" VARCHAR(100);
CREATE INDEX "logs_sessionId_idx" ON "logs"("sessionId");

-- AlterTable: suspicious_users — add triggeredRules (JSONB) and updatedAt
ALTER TABLE "suspicious_users"
  ADD COLUMN "triggeredRules" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now();
