-- Removes the trigram index in case you no longer want substring searching
DROP INDEX IF EXISTS "idx_script_content_trgm"; 