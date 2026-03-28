"use client";

import { indexNotes } from "@/services/noteService";
import { NoteData } from "@/types/noteTypes";
import { useEffect, useState } from "react";
import NoteCard from "./NoteCard";

export default function NotesContainer() {
  const [notes, setNotes] = useState([]);
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
  console.log(notes);
  return (
    <>
      {notes.map((note: NoteData) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </>
  );
}
