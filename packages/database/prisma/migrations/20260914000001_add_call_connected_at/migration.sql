-- Additive-only migration: track the exact moment both call peers establish a
-- WebRTC connection. Billing computes duration from this timestamp so callers
-- are never charged for unanswered/ringing or accepted-but-never-connected time.
-- Never drops anything.

-- AlterTable
ALTER TABLE "Call"
  ADD COLUMN "connectedAt" TIMESTAMP(3);