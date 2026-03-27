export interface NoteData {
  id: number;
  title: string;
  body: string;
  type: "text" | "checklist";
  items: ChecklistItemData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItemData {
  id?: number;
  completed: boolean;
  text: string;
  position?: number;
}

export type CreateNoteData = Omit<NoteData, "id" | "createdAt" | "updatedAt">;
