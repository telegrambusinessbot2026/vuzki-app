#!/usr/bin/env bash
#
# VUZKI - deployment smoke test.
#
# Verifies that a deployed API is healthy (liveness/readiness) and that auth
# guards are enforced on protected endpoints. Used by CI/CD after deploy.
#
# Usage:
#   API_BASE_URL=... APP_URL=... scripts/smoke-test.sh
#
set -uo pipefail

API_BASE="${API_BASE_URL:-https://api.vuzki.app}"
APP_URL="${APP_URL:-https://vuzki.app}"
PASS=0
FAIL=0

check() {
  local desc="$1"; local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  [PASS] $desc"; PASS=$((PASS+1))
  else
    echo "  [FAIL] $desc" >&2; FAIL=$((FAIL+1))
  fi
}

echo "== VUZKI smoke tests =="
echo "API: $API_BASE   APP: $APP_URL"

check "liveness /health returns ok" \
  "curl -fsS '$API_BASE/health' | grep -q '\"status\":\"ok\"'"

check "readiness /ready returns ok" \
  "curl -fsS '$API_BASE/ready' | grep -q '\"status\":\"ok\"'"

check "public app responds 200" \
  "curl -fsS -o /dev/null -w '%{http_code}' '$APP_URL' | grep -q '200'"

check "protected endpoint rejects unauthenticated (401)" \
  "test \"\$(curl -s -o /dev/null -w '%{http_code}' '$API_BASE/api/v1/me')\" = '401'"

check "unknown route returns 404" \
  "test \"\$(curl -s -o /dev/null -w '%{http_code}' '$API_BASE/api/v1/does-not-exist')\" = '404'"

check "oversized body rejected" \
  "test \"\$(curl -s -o /dev/null -w '%{http_code}' -X POST '$API_BASE/api/v1/auth/login' -H 'Content-Type: application/json' -d '{\"x\":\"$(printf 'a%.0s' {1..3000000})\"}')\" = '413'"

echo "== result: $PASS passed, $FAIL failed =="
[[ "$FAIL" -eq 0 ]]
