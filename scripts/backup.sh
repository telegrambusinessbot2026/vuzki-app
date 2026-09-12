#!/usr/bin/env bash
#
# VUZKI - PostgreSQL backup script.
#
# - dumps the database with pg_dump (logical backup)
# - encrypts the dump (age/gpg or openssl)
# - optionally uploads to object storage (S3-compatible)
# - prunes old backups per retention policy
# - NOTE: a backup is only considered valid once a restore has been TESTED.
#
# Usage:
#   BACKUP_BUCKET=s3://vuzki-backups DATABASE_URL=... scripts/backup.sh
#
set -euo pipefail

DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_BUCKET="${BACKUP_BUCKET:-}"          # e.g. s3://vuzki-backups
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/run/secrets/backup_key}" # optional
PG_DUMP="${PG_DUMP:-pg_dump}"

mkdir -p "${BACKUP_DIR}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="${BACKUP_DIR}/vuzki_${STAMP}.sql"
ENC="${DUMP}.age"

echo "[backup] dumping database..."
"${PG_DUMP}" --no-owner --clean --if-exists "${DB_URL}" > "${DUMP}"
echo "[backup] dump size: $(du -h "${DUMP}" | cut -f1)"

if [[ -n "${ENCRYPTION_KEY_FILE:-}" && -f "${ENCRYPTION_KEY_FILE}" ]]; then
  echo "[backup] encrypting..."
  if command -v age >/dev/null 2>&1; then
    age -r "$(age-keygen -y "${ENCRYPTION_KEY_FILE}")" "${DUMP}" > "${ENC}" 2>/dev/null
    rm -f "${DUMP}"
  elif command -v openssl >/dev/null 2>&1; then
    openssl enc -aes-256-cbc -salt -pbkdf2 -pass "file:${ENCRYPTION_KEY_FILE}" -in "${DUMP}" -out "${ENC}"
    rm -f "${DUMP}"
  else
    echo "[backup] warning: no encryption tool found; storing plaintext" >&2
  fi
fi

if [[ -n "${BACKUP_BUCKET}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    echo "[backup] uploading to ${BACKUP_BUCKET}..."
    aws s3 cp "${ENC:-${DUMP}}" "${BACKUP_BUCKET}/postgres/" --only-show-errors
    echo "[backup] pruning backups older than ${RETENTION_DAYS} days from ${BACKUP_BUCKET}..."
    aws s3 ls "${BACKUP_BUCKET}/postgres/" | awk -v days="${RETENTION_DAYS}" '
      { cutoff=systime()-days*86400; ts=mktime(gensub(/[-:]/," ","g",$1" "$2)); if(ts<cutoff) print $4 }' \
      | while read -r f; do aws s3 rm "${BACKUP_BUCKET}/postgres/${f}"; done
  else
    echo "[backup] warning: aws CLI not found; skipping upload" >&2
  fi
fi

# Local retention prune
find "${BACKUP_DIR}" -name 'vuzki_*' -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[backup] completed: ${ENC:-${DUMP}}"
