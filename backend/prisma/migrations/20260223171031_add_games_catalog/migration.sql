-- CreateEnum
CREATE TYPE "ExternalGameSource" AS ENUM ('STEAM', 'IGDB');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "canonicalSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "coverUrl" TEXT,
    "firstReleaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameExternalId" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "source" "ExternalGameSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameExternalId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSourceTag" (
    "gameId" TEXT NOT NULL,
    "source" "ExternalGameSource" NOT NULL,
    "externalTagId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "normalizedTagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSourceTag_pkey" PRIMARY KEY ("gameId","source","externalTagId")
);

-- CreateTable
CREATE TABLE "UserGame" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "owned" BOOLEAN NOT NULL DEFAULT true,
    "playtimeMinutes" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_canonicalSlug_key" ON "Game"("canonicalSlug");

-- CreateIndex
CREATE INDEX "GameExternalId_gameId_idx" ON "GameExternalId"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameExternalId_source_externalId_key" ON "GameExternalId"("source", "externalId");

-- CreateIndex
CREATE INDEX "GameSourceTag_source_externalTagId_idx" ON "GameSourceTag"("source", "externalTagId");

-- CreateIndex
CREATE INDEX "GameSourceTag_normalizedTagId_idx" ON "GameSourceTag"("normalizedTagId");

-- CreateIndex
CREATE INDEX "UserGame_gameId_idx" ON "UserGame"("gameId");

-- AddForeignKey
ALTER TABLE "GameExternalId" ADD CONSTRAINT "GameExternalId_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSourceTag" ADD CONSTRAINT "GameSourceTag_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSourceTag" ADD CONSTRAINT "GameSourceTag_normalizedTagId_fkey" FOREIGN KEY ("normalizedTagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
