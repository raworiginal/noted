"use client";

import { indexNotes } from "@/services/noteService";
import { NoteData } from "@/types/noteTypes";
import { useEffect, useState } from "react";
import NoteCard from "./NoteCard";
import Modal from "./Modal";
import NoteForm from "./NoteForm";

export default function NotesContainer() {
  const [notes, setNotes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const newNotes = await indexNotes();
        setNotes(newNotes);
      } catch (error) {
        console.error(error);
      }
    };
    fetchNotes();
  }, []);
  return (
    <>
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 p-4">
        {notes.map((note: NoteData) => (
          <div key={note.id} className="break-inside-avoid mb-4">
            <NoteCard note={note} />
          </div>
        ))}
      </div>
      <div className="fab">
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-lg btn-circle btn-primary"
        >
          +
        </button>
      </div>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <NoteForm />
      </Modal>
    </>
  );
}
