import { CreateNoteData, NoteData } from "@/types/noteTypes";

export async function createNote(data: CreateNoteData): Promise<NoteData> {
  const res = await fetch("/api/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to create note: ${res.status}`);
  }

  return res.json();
}
