package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/lestrrat-go/jwx/jwt"
	"github.com/lestrrat-go/jwx/v2/jwk"
)

type contextKey string

const UserContextKey = contextKey("user_id")

type AuthMiddleware struct {
	cache   *jwk.Cache
	jwksURL string
}

func newAuthMiddleware(betterAuthURL string) (*AuthMiddleware, error) {
	jwksURL := betterAuthURL + "/api/auth/jwks"
	cache := jwk.NewCache(context.Background())
	if err := cache.Register(jwksURL); err != nil {
		return nil, fmt.Errorf("register jwks: %w", err)
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
