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
