#!/usr/bin/env bash
#
# VUZKI - PostgreSQL restore (and restore TEST) script.
#
# Restores a backup produced by scripts/backup.sh into a target database.
# Also used to periodically TEST that backups are restorable - a backup is not
# considered valid until a restore has succeeded.
#
# Usage:
#   TARGET_DATABASE_URL=... scripts/restore.sh [backup_file]
#   (without arg, restores the most recent backup in BACKUP_DIR)
#
set -euo pipefail

TARGET_DATABASE_URL="${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/run/secrets/backup_key}"
PSQL="${PSQL:-psql}"

if [[ $# -ge 1 && -n "$1" ]]; then
  BACKUP_FILE="$1"
else
  BACKUP_FILE="$(ls -1t "${BACKUP_DIR}"/vuzki_*.sql*.age 2>/dev/null | head -n1 || true)"
  [[ -n "${BACKUP_FILE}" ]] || { echo "[restore] no backup found in ${BACKUP_DIR}" >&2; exit 1; }
fi

DECRYPTED="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.age && -f "${ENCRYPTION_KEY_FILE}" ]]; then
  DECRYPTED="${BACKUP_FILE%.age}"
  echo "[restore] decrypting ${BACKUP_FILE}..."
  if command -v age >/dev/null 2>&1; then
    age -d -i "${ENCRYPTION_KEY_FILE}" "${BACKUP_FILE}" > "${DECRYPTED}"
  else
    echo "[restore] age not found; cannot decrypt" >&2; exit 1
  fi
fi

echo "[restore] applying ${DECRYPTED} to target..."
"${PSQL}" "${TARGET_DATABASE_URL}" < "${DECRYPTED}"
[[ "${DECRYPTED}" != "${BACKUP_FILE}" ]] && rm -f "${DECRYPTED}"

echo "[restore] verifying..."
TABLE_COUNT="$("${PSQL}" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" "${TARGET_DATABASE_URL}")"
echo "[restore] OK - ${TABLE_COUNT} public tables restored."
