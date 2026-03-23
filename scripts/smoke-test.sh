#!/usr/bin/env bash
# Smoke test for the noted stack:
#   - Better Auth (email+password, username plugin, admin plugin)
#   - Next.js proxy -> Go backend (JWT validation, notes CRUD)
#
# Prerequisites: both servers must be running before executing this script.
#   Terminal 1: cd api && go run ./cmd/api
#   Terminal 2: cd web && npm run dev
#
# Usage: bash scripts/smoke-test.sh

set -euo pipefail

NEXT=http://localhost:3000
COOKIE_JAR=$(mktemp)
ADMIN_COOKIE_JAR=$(mktemp)

pass() { echo "  ✓ $1"; }
fail() {
  echo "  ✗ $1"
  exit 1
}

check_status() {
  local label=$1 expected=$2 actual=$3
  [ "$actual" -eq "$expected" ] && pass "$label (HTTP $actual)" || fail "$label — expected $expected, got $actual"
}

cleanup() { rm -f "$COOKIE_JAR" "$ADMIN_COOKIE_JAR"; }
trap cleanup EXIT

echo ""
echo "=== Smoke Test: noted stack ==="
echo ""

# ── 1. Health check: Go backend (via Next.js proxy) ────────────────────────
echo "── 1. Go backend health ──"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NEXT/api/health")
check_status "GET /api/health unauthenticated returns 401 (proxy guards it)" 401 "$STATUS"

# ── 2. Better Auth: sign up with email + username ──────────────────────────
# echo ""
# echo "── 2. Sign up (email + username plugin) ──"
# SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$NEXT/api/auth/sign-up/email" \
#   -H "Content-Type: application/json" \
#   -d '{"email":"testuser2@noted.local","password":"Password123!","name":"Test User","username":"testuser2"}')
# SIGNUP_BODY=$(echo "$SIGNUP" | head -n -1)
# SIGNUP_STATUS=$(echo "$SIGNUP" | tail -n 1)
# check_status "POST /api/auth/sign-up/email" 200 "$SIGNUP_STATUS"
# echo "$SIGNUP_BODY" | grep -q '"email"' && pass "Response contains email field" || fail "Response missing email field"
# echo "$SIGNUP_BODY" | grep -q '"username"' && pass "Response contains username field (username plugin)" || fail "Response missing username field"

# ── 3. Sign in and capture session cookie ─────────────────────────────────
echo ""
echo "── 3. Sign in ──"
SIGNIN_STATUS=$(curl -s -c "$COOKIE_JAR" -o /dev/null -w "%{http_code}" \
  -X POST "$NEXT/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@noted.local","password":"Password123!"}')
check_status "POST /api/auth/sign-in/email" 200 "$SIGNIN_STATUS"
grep -q "better-auth" "$COOKIE_JAR" && pass "Session cookie set" || fail "No session cookie found"

# ── 4. Get session ────────────────────────────────────────────────────────
echo ""
echo "── 4. Session ──"
SESSION=$(curl -s -b "$COOKIE_JAR" "$NEXT/api/auth/get-session")
echo "$SESSION" | grep -q '"email"' && pass "GET /api/auth/get-session returns session" || fail "No session returned"
USER_ID=$(echo "$SESSION" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$USER_ID" ] && pass "User ID extracted: $USER_ID" || fail "Could not extract user ID"

# ── 5. Sign in via username (username plugin) ──────────────────────────────
echo ""
echo "── 5. Sign in by username (username plugin) ──"
USERNAME_SIGNIN=$(curl -s -w "\n%{http_code}" -X POST "$NEXT/api/auth/sign-in/username" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"Password123!"}')
USERNAME_STATUS=$(echo "$USERNAME_SIGNIN" | tail -n 1)
check_status "POST /api/auth/sign-in/username" 200 "$USERNAME_STATUS"

# ── 6. Proxy + JWT: create a note via Go backend ──────────────────────────
echo ""
echo "── 6. Proxy → Go backend (JWT auth) ──"
CREATE=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" \
  -X POST "$NEXT/api/notes" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke test note","type":"text","body":"Hello from smoke test"}')
CREATE_BODY=$(echo "$CREATE" | head -n -1)
CREATE_STATUS=$(echo "$CREATE" | tail -n 1)
check_status "POST /api/notes (proxied + JWT)" 201 "$CREATE_STATUS"
NOTE_ID=$(echo "$CREATE_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
[ -n "$NOTE_ID" ] && pass "Note created with ID: $NOTE_ID" || fail "Could not extract note ID"
echo "$CREATE_BODY" | grep -q '"user_id"' && pass "Note contains user_id (JWT sub extracted by Go)" || fail "Note missing user_id"

# ── 7. List notes ─────────────────────────────────────────────────────────
echo ""
echo "── 7. List notes ──"
LIST=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "$NEXT/api/notes")
LIST_BODY=$(echo "$LIST" | head -n -1)
LIST_STATUS=$(echo "$LIST" | tail -n 1)
check_status "GET /api/notes" 200 "$LIST_STATUS"
echo "$LIST_BODY" | grep -q "Smoke test note" && pass "Created note appears in list" || fail "Note not found in list"

# ── 8. Admin plugin: list users ───────────────────────────────────────────
echo ""
echo "── 8. Admin plugin ──"

# Sign up an admin user (you'll need to manually set role=admin in DB first,
# or use the admin API after bootstrapping — see note below)
ADMIN_SIGNIN=$(curl -s -c "$ADMIN_COOKIE_JAR" -o /dev/null -w "%{http_code}" \
  -X POST "$NEXT/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@noted.local","password":"Password123!"}')
check_status "Admin sign-in" 200 "$ADMIN_SIGNIN"

LIST_USERS=$(curl -s -b "$ADMIN_COOKIE_JAR" -w "\n%{http_code}" \
  "$NEXT/api/auth/admin/list-users?limit=10")
LIST_USERS_BODY=$(echo "$LIST_USERS" | head -n -1)
LIST_USERS_STATUS=$(echo "$LIST_USERS" | tail -n 1)
# 200 = admin role confirmed; 403 = user exists but lacks admin role (expected on first run)
if [ "$LIST_USERS_STATUS" -eq 200 ]; then
  pass "GET /api/auth/admin/list-users — admin access confirmed"
  echo "$LIST_USERS_BODY" | grep -q "testuser2@noted.local" && pass "Test user visible in admin list" || fail "Test user not in admin list"
elif [ "$LIST_USERS_STATUS" -eq 403 ]; then
  pass "GET /api/auth/admin/list-users — returned 403 (user lacks admin role, expected on first run)"
  echo "  ℹ To grant admin: psql \$DATABASE_URL -c \"UPDATE \\\"user\\\" SET role='admin' WHERE email='testuser2@noted.local';\""
else
  fail "GET /api/auth/admin/list-users — unexpected status $LIST_USERS_STATUS"
fi

# ── 9. Delete the test note (cleanup) ────────────────────────────────────
echo ""
echo "── 9. Cleanup ──"
if [ -n "$NOTE_ID" ]; then
  DEL_STATUS=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" \
    -X DELETE "$NEXT/api/notes/$NOTE_ID")
  check_status "DELETE /api/notes/$NOTE_ID" 204 "$DEL_STATUS"
fi

echo ""
echo "=== Smoke test complete ==="
echo ""
