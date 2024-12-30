/*
  Warnings:

  - Added the required column `ip` to the `Install` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Install" DROP CONSTRAINT "Install_userId_fkey";

-- DropIndex
DROP INDEX "Install_userId_scriptId_key";

-- AlterTable
ALTER TABLE "Install" ADD COLUMN     "ip" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Install" ADD CONSTRAINT "Install_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
