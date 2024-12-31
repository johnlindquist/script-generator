-- Add index for script listing by status and saved flag
CREATE INDEX "Script_status_saved_idx" ON "Script"("status", "saved");

-- Add index for script listing by owner
CREATE INDEX "Script_ownerId_idx" ON "Script"("ownerId");

-- Add index for script listing by creation date
CREATE INDEX "Script_createdAt_idx" ON "Script"("createdAt");

-- Add index for script versions by script ID
CREATE INDEX "ScriptVersion_scriptId_idx" ON "ScriptVersion"("scriptId");

-- Add index for installs by script ID
CREATE INDEX "Install_scriptId_idx" ON "Install"("scriptId");

-- Add index for favorites by script ID
CREATE INDEX "Favorite_scriptId_idx" ON "Favorite"("scriptId");

-- Add index for verifications by script ID
CREATE INDEX "Like_scriptId_idx" ON "Like"("scriptId"); 