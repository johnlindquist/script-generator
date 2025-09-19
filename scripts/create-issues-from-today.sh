#!/bin/bash

cat .cursor/rules/create-issues-from-today.mdc | claude -p --allowedTools "mcp__basic-memory__switch_project,mcp__basic-memory__write_note"