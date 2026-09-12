#!/usr/bin/env bash
#
# VUZKI - health/readiness poller.
#
# Polls /health (liveness) and /ready (readiness) until they succeed or the
# retry limit is reached. Exits 0 on success, 1 on failure. Used by deploy /
# orchestration to gate traffic.
#
# Usage:
#   HEALTH_CHECK_URL=... scripts/health-check.sh
#
set -euo pipefail

API_BASE="${HEALTH_CHECK_URL:-https://api.vuzki.app}"
RETRIES="${HEALTH_CHECK_RETRIES:-5}"
SLEEP="${HEALTH_CHECK_SLEEP:-3}"

echo "[health] target: ${API_BASE}"

for i in $(seq 1 "${RETRIES}"); do
  if curl -fsS "${API_BASE}/health" >/dev/null 2>&1 && curl -fsS "${API_BASE}/ready" >/dev/null 2>&1; then
    echo "[health] OK (attempt ${i})"
    exit 0
  fi
  echo "[health] attempt ${i}/${RETRIES} not ready; retrying in ${SLEEP}s..."
  sleep "${SLEEP}"
done

echo "[health] FAILED after ${RETRIES} attempts" >&2
exit 1
