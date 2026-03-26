export interface NoteData {
  id: number;
  title: string;
  body: string;
  type: "text" | "checklist";
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItem {
  id?: number;
  completed: boolean;
  text: string;
  position: number;
}

export type CreateNoteData = Omit<NoteData, "id" | "createdAt" | "updatedAt">;
