#!/bin/bash
# ============================================================
# API Testing Script — Rock Paper Scissors
# Usage: bash scripts/api-test.sh [http://localhost:3000]
# ============================================================
set -e

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

check() {
  local desc="$1" expected_code="$2" method="$3" url="$4" data="$5"
  local code
  if [ -z "$data" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$data")
  fi
  if [ "$code" = "$expected_code" ]; then
    green "  ✓ $desc (HTTP $code)"
    PASS=$((PASS + 1))
  else
    red "  ✗ $desc — expected $expected_code, got $code"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo " Rock Paper Scissors — API Test Suite"
echo " Target: $BASE"
echo "============================================"
echo ""

# -----------------------------------
echo "[Health Check]"
# -----------------------------------
check "Health endpoint" 200 GET "$BASE/api/health"

# -----------------------------------
echo ""
echo "[Score API]"
# -----------------------------------
check "Get high score" 200 GET "$BASE/api/score"

# -----------------------------------
echo ""
echo "[Game API]"
# -----------------------------------
check "Play rock"     200 POST "$BASE/api/game/play" '{"action":"rock","currentScore":0}'
check "Play paper"    200 POST "$BASE/api/game/play" '{"action":"paper","currentScore":5}'
check "Play scissors" 200 POST "$BASE/api/game/play" '{"action":"scissors","currentScore":10}'
check "Invalid action" 400 POST "$BASE/api/game/play" '{"action":"invalid","currentScore":0}'

# -----------------------------------
echo ""
echo "[Rate Limiting — rapid fire 10 requests]"
# -----------------------------------
for i in $(seq 1 10); do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/game/play" \
    -H "Content-Type: application/json" \
    -d '{"action":"rock","currentScore":0}')
  if [ "$code" = "200" ]; then
    echo "  Request $i: HTTP $code ✓"
  else
    echo "  Request $i: HTTP $code (rate limited?)"
  fi
  sleep 0.1
done

# -----------------------------------
echo ""
echo "============================================"
green "  Passed: $PASS"
if [ $FAIL -gt 0 ]; then
  red "  Failed: $FAIL"
fi
echo "============================================"

[ $FAIL -eq 0 ] && exit 0 || exit 1
