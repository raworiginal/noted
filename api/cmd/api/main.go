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
