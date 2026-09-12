#!/usr/bin/env bash
#
# VUZKI - apply database migrations.
#
# Runs Prisma Migrate in deploy mode (safe; never auto-drops tables). Migrations
# are version-controlled in packages/database/prisma/migrations and must pass
# staging before being run against production.
#
# Usage:
#   DATABASE_URL=... scripts/migrate.sh
#
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
SCHEMA="${SCHEMA:-packages/database/prisma/schema.prisma}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT}"
export DATABASE_URL

echo "[migrate] generating client..."
npx --prefix packages/database prisma generate --schema "${SCHEMA}"

echo "[migrate] applying migrations to ${DATABASE_URL}"
npx --prefix packages/database prisma migrate deploy --schema "${SCHEMA}"

echo "[migrate] complete."
