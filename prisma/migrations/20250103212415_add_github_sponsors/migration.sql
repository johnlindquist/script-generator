/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "GithubSponsor" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "databaseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubSponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubSponsor_login_key" ON "GithubSponsor"("login");

-- CreateIndex
CREATE UNIQUE INDEX "GithubSponsor_nodeId_key" ON "GithubSponsor"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubSponsor_databaseId_key" ON "GithubSponsor"("databaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "GithubSponsor" ADD CONSTRAINT "GithubSponsor_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
