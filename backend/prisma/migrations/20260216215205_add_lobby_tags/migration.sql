-- DropIndex
DROP INDEX "Tag_label_key";

-- CreateTable
CREATE TABLE "LobbyTagPreference" (
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbyTagPreference_pkey" PRIMARY KEY ("lobbyId","userId","tagId")
);

-- CreateIndex
CREATE INDEX "LobbyTagPreference_lobbyId_userId_idx" ON "LobbyTagPreference"("lobbyId", "userId");

-- CreateIndex
CREATE INDEX "LobbyTagPreference_tagId_idx" ON "LobbyTagPreference"("tagId");

-- AddForeignKey
ALTER TABLE "LobbyTagPreference" ADD CONSTRAINT "LobbyTagPreference_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyTagPreference" ADD CONSTRAINT "LobbyTagPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyTagPreference" ADD CONSTRAINT "LobbyTagPreference_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
