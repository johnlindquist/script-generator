-- CreateTable
CREATE TABLE "Install" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Install_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Install_userId_scriptId_key" ON "Install"("userId", "scriptId");

-- AddForeignKey
ALTER TABLE "Install" ADD CONSTRAINT "Install_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Install" ADD CONSTRAINT "Install_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
