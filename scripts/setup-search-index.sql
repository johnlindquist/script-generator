-- This script will enable the trigram extension and create an index on the "content" column
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_script_content_trgm"
  ON "Script"
  USING GIN ("content" gin_trgm_ops); 