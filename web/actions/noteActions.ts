import { CreateNoteData } from "@/types/noteTypes";

const NEXT_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export async function createNote(data: CreateNoteData) {
  const res = await fetch(`${NEXT_URL}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("failed to create note");
  return res.json();
}
