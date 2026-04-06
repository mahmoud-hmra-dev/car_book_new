#!/bin/bash
# Sequential build script - builds one service at a time to avoid 100% CPU
# Usage: ./build.sh

set -e

echo "=== Building backend ==="
docker compose build bc-backend

echo "=== Building admin ==="
docker compose build bc-admin

echo "=== Building frontend ==="
docker compose build bc-frontend

echo "=== Building payment ==="
docker compose build payment

echo "=== Building MCP ==="
docker compose build bc-mcp

echo "=== All builds complete. Starting services ==="
docker compose up -d
