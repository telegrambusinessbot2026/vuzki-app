-- Additive-only migration: Follow relations (virtual, no columns), a new
-- ProfileView aggregate + user-facing theme/language preferences. Never drops
-- anything.

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'dark',
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "profileOwnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileView_viewerId_profileOwnerId_key" ON "ProfileView"("viewerId", "profileOwnerId");

-- CreateIndex
CREATE INDEX "ProfileView_profileOwnerId_idx" ON "ProfileView"("profileOwnerId");

-- AddForeignKey
ALTER TABLE "ProfileView"
    ADD CONSTRAINT "ProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView"
    ADD CONSTRAINT "ProfileView_profileOwnerId_fkey" FOREIGN KEY ("profileOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;