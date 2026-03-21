package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DatabaseURL   string
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
