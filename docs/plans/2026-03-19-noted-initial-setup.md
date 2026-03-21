# Noted Initial Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the Go backend and Next.js proxy so the two apps share a Postgres database, with better-auth (Next.js/drizzle) owning auth tables and goose (Go) owning app tables.

**Architecture:** Next.js owns all auth via better-auth and proxies all `/api/*` requests to the Go backend, injecting a better-auth JWT as the Bearer token. Go validates the JWT using better-auth's JWKS endpoint. Both apps share one Postgres database — drizzle migrations run first (auth tables), then goose migrations run on Go startup (notes tables).

**Tech Stack:** Next.js 15 (App Router), better-auth, drizzle-orm, Go 1.25, chi, goose v3, lestrrat-go/jwx v2, postgres

---

## Prerequisites

Before starting:
1. Postgres is running: `docker compose up -d`
2. `.env` exists at repo root with at minimum:
   ```
   DATABASE_URL=postgres://postgres:password@localhost:5432/noted
   POSTGRES_DB=noted
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=password
   BETTER_AUTH_SECRET=<random string, at least 32 chars>
   BETTER_AUTH_URL=http://localhost:3000
   ```
3. Next.js deps installed: `cd web && npm install`

---

## Task 1: Run drizzle migrations (auth tables)

**Files:** none to create — already set up

**Step 1: Run the drizzle migration**

```bash
cd web
npx drizzle-kit migrate
```

Expected output: migration applied, tables `user`, `session`, `account`, `verification`, `jwks` created in Postgres.

**Step 2: Verify**

```bash
psql $DATABASE_URL -c "\dt"
```

Expected: the five auth tables are listed.

---

## Task 2: Scaffold the Go backend directory

**Files:**
- Create: `go/cmd/api/main.go` (empty placeholder for now)
- Create: `go/go.mod`

**Step 1: Create the directory structure**

```bash
mkdir -p go/cmd/api
mkdir -p go/internal/{config,db/migrations,handler,middleware,model,repository}
```

**Step 2: Initialise the Go module**

```bash
cd go
go mod init github.com/raworiginal/noted
```

This creates `go/go.mod`.

**Step 3: Add dependencies**

```bash
go get github.com/go-chi/chi/v5
go get github.com/joho/godotenv
go get github.com/lib/pq
go get github.com/pressly/goose/v3
```

---

## Task 3: Config package

**Files:**
- Create: `go/internal/config/config.go`

**Step 1: Write config.go**

Adapt from goNotes but remove JWT-secret, token TTL, and CORS fields (CORS is not needed — Go only speaks to Next.js on localhost):

```go
package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	BetterAuthURL string // e.g. http://localhost:3000 — used to fetch JWKS
}

func Load() *Config {
	_ = godotenv.Load("../.env")
	return &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   mustGetEnv("DATABASE_URL"),
		BetterAuthURL: getEnv("BETTER_AUTH_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env var: " + key)
	}
	return v
}
```

---

## Task 4: Go database + goose migrations

**Files:**
- Create: `go/internal/db/migrations/migrations.go`
- Create: `go/internal/db/migrations/00001_init.sql`
- Create: `go/internal/db/db.go`

**Step 1: Write migrations.go** (embed FS, identical pattern to goNotes)

```go
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
```

**Step 2: Write 00001_init.sql**

Notes tables only. `user_id` is `TEXT` referencing better-auth's `user` table:

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  type       VARCHAR(20) NOT NULL CHECK(type IN ('text', 'checklist')),
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id         SERIAL PRIMARY KEY,
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  position   INTEGER NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS notes;
```

**Step 3: Write db.go** (same pattern as goNotes)

```go
package db

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
	"github.com/raworiginal/noted/internal/db/migrations"
)

func Open(databaseURL string) (*sql.DB, error) {
	connStr := databaseURL + "?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return nil, fmt.Errorf("set dialect: %w", err)
	}
	if err := goose.Up(db, "."); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	return db, nil
}
```

---

## Task 5: Model and repository (notes only)

**Files:**
- Create: `go/internal/model/note.go`
- Create: `go/internal/repository/notes.go`
- Create: `go/internal/repository/errors.go`
- Create: `go/internal/repository/store.go`

**Step 1: Write model/note.go**

Identical to goNotes except `UserID` is `string`:

```go
package model

import "time"

type ChecklistItem struct {
	ID        int    `json:"id"`
	Completed bool   `json:"completed"`
	Text      string `json:"text"`
	Position  int    `json:"position"`
}

type Note struct {
	ID        int             `json:"id"`
	UserID    string          `json:"user_id"`
	Title     string          `json:"title"`
	Type      string          `json:"type"`
	Body      string          `json:"body"`
	Items     []ChecklistItem `json:"items,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}
```

**Step 2: Write repository/errors.go**

```go
package repository

import "errors"

var ErrNotFound = errors.New("not found")
```

**Step 3: Write repository/notes.go**

Copy from goNotes (`goNotes/internal/repository/notes.go`) with two changes:
1. Update import path: `github.com/raworiginal/noted/internal/model`
2. Change `ListNotes` signature from `userID int` to `userID string`
3. The SQL queries do not need to change — `$1` for user_id will now bind a string

**Step 4: Write repository/store.go**

```go
package repository

import "database/sql"

type Store struct {
	Notes *PGNoteRepository
}

func NewStore(db *sql.DB) *Store {
	return &Store{
		Notes: NewNoteRepository(db),
	}
}
```

---

## Task 6: Auth middleware (JWKS-based JWT validation)

**Files:**
- Create: `go/internal/middleware/auth.go`

The Go middleware must:
1. Read the `Authorization: Bearer <token>` header
2. Fetch better-auth's JWKS from `<BETTER_AUTH_URL>/api/auth/jwks`
3. Validate the token against the JWKS public key
4. Extract the `sub` claim as the user ID (a text UUID)
5. Store user ID in request context

**Step 1: Add dependency**

```bash
cd go
go get github.com/lestrrat-go/jwx/v2
```

This single package handles JWKS fetching, key caching, and JWT parsing.

**Step 2: Write middleware/auth.go**

```go
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

type contextKey string

const UserContextKey = contextKey("user_id")

type AuthMiddleware struct {
	cache *jwk.Cache
	jwksURL string
}

func NewAuthMiddleware(betterAuthURL string) (*AuthMiddleware, error) {
	jwksURL := betterAuthURL + "/api/auth/jwks"
	cache := jwk.NewCache(context.Background())
	if err := cache.Register(jwksURL); err != nil {
		return nil, fmt.Errorf("register jwks: %w", err)
	}
	// Warm the cache on startup
	if _, err := cache.Refresh(context.Background(), jwksURL); err != nil {
		return nil, fmt.Errorf("fetch jwks: %w", err)
	}
	return &AuthMiddleware{cache: cache, jwksURL: jwksURL}, nil
}

func UserIDFromContext(r *http.Request) (string, error) {
	userID, ok := r.Context().Value(UserContextKey).(string)
	if !ok || userID == "" {
		return "", fmt.Errorf("user_id not in context")
	}
	return userID, nil
}

func (am *AuthMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"error":"invalid authorization header"}`, http.StatusUnauthorized)
			return
		}

		keySet, err := am.cache.Get(r.Context(), am.jwksURL)
		if err != nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse([]byte(parts[1]), jwt.WithKeySet(keySet))
		if err != nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		sub := token.Subject()
		if sub == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

---

## Task 7: Notes handler

**Files:**
- Create: `go/internal/handler/notes.go`
- Create: `go/internal/handler/utils.go`

**Step 1: Write handler/utils.go**

```go
package handler

import (
	"encoding/json"
	"net/http"
)

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
```

**Step 2: Write handler/notes.go**

Copy from goNotes (`goNotes/internal/handler/notes.go`) with these changes:
1. Update import paths to `github.com/raworiginal/noted/internal/...`
2. Remove `cfg *config.Config` field from `NotesHandler` (no longer needed)
3. Update `NewNotesHandler` signature to remove cfg param
4. Change `userID` variable type from `int` to `string` in all handler methods (the middleware now returns `string`)
5. Remove `import "strconv"` if it becomes unused (note IDs are still int, so `strconv.Atoi` is still needed for URL params)

---

## Task 8: main.go

**Files:**
- Create: `go/cmd/api/main.go`

**Step 1: Write main.go**

Adapt from goNotes but remove auth routes, remove CORS (not needed), wire up JWKS middleware:

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	mw "github.com/go-chi/chi/v5/middleware"
	"github.com/raworiginal/noted/internal/config"
	"github.com/raworiginal/noted/internal/db"
	"github.com/raworiginal/noted/internal/handler"
	am "github.com/raworiginal/noted/internal/middleware"
	repo "github.com/raworiginal/noted/internal/repository"
)

func main() {
	cfg := config.Load()

	database, err := db.Open(cfg.DatabaseURL)
	if err != nil {
		panic(err)
	}
	defer database.Close()

	store := repo.NewStore(database)
	noteHandler := handler.NewNotesHandler(store)

	authMiddleware, err := am.NewAuthMiddleware(cfg.BetterAuthURL)
	if err != nil {
		panic(err)
	}

	r := chi.NewRouter()
	r.Use(mw.Logger)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	r.Route("/notes", func(r chi.Router) {
		r.Use(authMiddleware.Handler)
		r.Get("/", noteHandler.List)
		r.Post("/", noteHandler.Create)
		r.Get("/{id}", noteHandler.GetNoteByID)
		r.Put("/{id}", noteHandler.UpdateNote)
		r.Patch("/{id}", noteHandler.PatchNote)
		r.Delete("/{id}", noteHandler.DeleteNote)
	})

	fmt.Printf("Go backend running on http://localhost:%s\n", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		panic(err)
	}
}
```

**Step 2: Verify the Go project builds**

```bash
cd go
go build ./...
```

Expected: no errors.

---

## Task 9: Next.js catch-all proxy route

**Files:**
- Create: `web/app/api/[...proxy]/route.ts`

This route intercepts all `/api/*` requests that are **not** `/api/auth/*` (better-auth handles those itself via its own route handler), fetches a JWT for the current session, and forwards the request to the Go backend.

**Step 1: Install better-auth client (if not already installed)**

```bash
cd web
npm install better-auth
```

(It may already be installed — check `package.json`.)

**Step 2: Write web/app/api/[...proxy]/route.ts**

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL ?? "http://localhost:8080";

async function proxy(req: NextRequest): Promise<NextResponse> {
  // Get the current session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get a JWT for this session user
  const jwtResponse = await auth.api.getToken({ headers: await headers() });
  if (!jwtResponse?.token) {
    return NextResponse.json({ error: "could not issue token" }, { status: 500 });
  }

  // Strip /api prefix, forward to Go
  const url = req.nextUrl.pathname.replace(/^\/api/, "");
  const search = req.nextUrl.search ?? "";
  const targetURL = `${GO_BACKEND_URL}${url}${search}`;

  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.set("Authorization", `Bearer ${jwtResponse.token}`);
  // Remove Next.js internal headers that shouldn't be forwarded
  forwardedHeaders.delete("host");

  const goRes = await fetch(targetURL, {
    method: req.method,
    headers: forwardedHeaders,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    duplex: "half",
  } as RequestInit);

  const body = await goRes.arrayBuffer();
  return new NextResponse(body, {
    status: goRes.status,
    headers: { "Content-Type": goRes.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
```

**Note on `auth.api.getToken`:** better-auth's JWT plugin exposes this method on the server-side auth instance. It returns the signed JWT for the current session. Check `node_modules/better-auth/dist/docs/` if the method name differs in the installed version.

**Step 3: Add GO_BACKEND_URL to .env**

Add to your root `.env`:

```
GO_BACKEND_URL=http://localhost:8080
```

And expose it to Next.js in `web/next.config.ts` if needed (server-side env vars don't need `NEXT_PUBLIC_` prefix and are available automatically in route handlers).

---

## Task 10: Wire up better-auth route handler (if not already done)

**Files:**
- Create (if missing): `web/app/api/auth/[...all]/route.ts`

better-auth needs its own catch-all route at `/api/auth/*`. Check if it exists:

```bash
ls web/app/api/auth/
```

If missing, create `web/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

## Task 11: Smoke test end-to-end

**Step 1: Start Postgres**

```bash
docker compose up -d
```

**Step 2: Run drizzle migrations**

```bash
cd web && npx drizzle-kit migrate
```

**Step 3: Start the Go backend**

```bash
cd go && go run ./cmd/api
```

Expected: `Go backend running on http://localhost:8080` and goose migration logs for `notes` and `checklist_items`.

**Step 4: Start Next.js**

```bash
cd web && npm run dev
```

**Step 5: Register a user via better-auth**

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

Expected: `200` with user object.

**Step 6: Sign in and get a session cookie**

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Step 7: Create a note via the proxy**

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"My first note","type":"text","body":"Hello world"}'
```

Expected: `201` with the created note, including a text `user_id`.

**Step 8: List notes**

```bash
curl -b cookies.txt http://localhost:3000/api/notes
```

Expected: `200` with array containing the note from Step 7.
