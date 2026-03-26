import { getAuthHeaders } from "@/lib/go-client";
import { CreateNoteData } from "@/types/noteTypes";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL ?? "http://localhost:8080";

export async function createNote(data: CreateNoteData) {
  const res = await fetch(`${GO_BACKEND_URL}/notes`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("failed to create note");
  return res.json();
}
