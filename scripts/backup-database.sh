#!/bin/bash

# Get the current timestamp for the backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./database-backups"
BACKUP_FILE="${BACKUP_DIR}/script_generator_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Source the environment variables
source .env

# Use the Neon PostgreSQL connection (non-pooling URL for pg_dump)
echo "Creating database backup..."
pg_dump "$NEON_POSTGRES_POSTGRES_URL_NON_POOLING" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Database backup created successfully: $BACKUP_FILE"
  
  # Create a compressed version of the backup
  gzip -c "$BACKUP_FILE" > "${BACKUP_FILE}.gz"
  
  if [ $? -eq 0 ]; then
    echo "✅ Compressed backup created: ${BACKUP_FILE}.gz"
    echo "Original size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo "Compressed size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"
  else
    echo "❌ Failed to compress backup file."
  fi
else
  echo "❌ Database backup failed!"
  exit 1
fi

echo "Done!" 