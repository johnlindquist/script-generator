#!/bin/bash

# Load environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Run Prisma commands
npx prisma generate
npx prisma db push 