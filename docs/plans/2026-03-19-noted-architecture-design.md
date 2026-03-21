# Noted Architecture Design

Date: 2026-03-19

## Overview

A notes app with a Next.js frontend (owning authentication via better-auth) and a Go backend (owning business logic). Both share a single Postgres database. The client only ever talks to Next.js; Go is internal.

## Architecture

```
Browser
  │
  ▼
Next.js (:3000)
  ├── /api/auth/*  →  better-auth (login, session, JWT issuance)
  └── /api/*       →  catch-all proxy route
                         1. reads better-auth session
                         2. fetches JWT via better-auth JWT plugin
                         3. forwards request to Go with Authorization: Bearer <jwt>
                              │
                              ▼
                         Go backend (:8080)
                           - validates JWT via better-auth JWKS endpoint
                           - extracts user ID (text UUID) from claims
                           - serves notes API
                              │
                              ▼
                         Postgres (shared)
                           ├── auth tables  (drizzle/Next.js owns migrations)
                           └── app tables   (goose/Go owns migrations)
```

## Request Proxy

A single Next.js route handler at `web/app/api/[...proxy]/route.ts` handles all non-auth API requests:

1. Reads the better-auth session from the incoming request
2. Uses better-auth's JWT plugin to retrieve a signed JWT for the session user
3. Strips the `/api` prefix and forwards the request to the Go backend (`http://localhost:8080`)
4. Attaches `Authorization: Bearer <jwt>` to the forwarded request
5. Streams the Go response back to the client

The client never talks to Go directly. No CORS configuration needed on Go. No token caching on the client.

## Authentication

- **better-auth** handles all user-facing auth: registration, login, session management
- **better-auth JWT plugin** issues signed JWTs; public keys are exposed at `/api/auth/jwks`
- **Go middleware** fetches the JWKS on startup (and periodically refreshes) and validates incoming Bearer tokens
- The `sub` claim in the JWT is the better-auth `user.id` (text UUID), used as `user_id` in Go's notes tables

## Migration Strategy

**Drizzle (Next.js)** owns auth tables:
- `user`, `session`, `account`, `verification`, `jwks`
- Already defined in `web/db/schema.ts`
- Run via `drizzle-kit migrate` before starting the Go server

**Goose (Go)** owns app tables:
- `notes`, `checklist_items`
- `user_id` is `TEXT` (references better-auth's `user.id`)
- No `users` table, no `refresh_tokens` table
- Migrations live in `go/internal/db/migrations/`
- Run automatically on Go startup (same pattern as goNotes)

**Ordering contract:** Drizzle migrations must run before the Go server starts, since Go's `notes` table has a FK to better-auth's `user` table.

## Project Structure

```
noted/
├── docker-compose.yml
├── .env
├── web/                          # Next.js
│   ├── app/
│   │   └── api/
│   │       └── [...proxy]/
│   │           └── route.ts      # catch-all proxy to Go
│   ├── db/schema.ts              # auth tables
│   ├── lib/auth.ts               # better-auth config
│   └── ...
└── go/                           # Go backend
    ├── cmd/api/main.go
    ├── go.mod                    # module: github.com/raworiginal/noted
    └── internal/
        ├── config/
        ├── db/
        │   ├── db.go
        │   └── migrations/
        │       ├── migrations.go
        │       └── 00001_init.sql
        ├── handler/
        │   ├── notes.go
        │   └── utils.go
        ├── middleware/
        │   └── auth.go           # JWKS-based JWT validation
        ├── model/
        └── repository/
```

## What Changes from goNotes

Removed:
- `internal/handler/auth.go` (auth is Next.js's responsibility)
- `internal/token/` package
- `internal/repository/users.go`, `tokens.go`
- Migration tables: `users`, `refresh_tokens`

Changed:
- `user_id` in `notes` is `TEXT` instead of `INTEGER`
- Auth middleware validates JWTs via JWKS instead of a shared secret
- Module path: `github.com/raworiginal/noted`
