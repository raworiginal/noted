"use client";
interface ChecklistItemProps {
  completed: boolean;
  text: string;
  position: number;
  deleteItem: any;
  updateItemCompleted: any;
  updateItemText: any;
}

export default function ChecklistItem({
  completed,
  text,
  position,
  deleteItem,
  updateItemCompleted,
  updateItemText,
}: ChecklistItemProps) {
  return (
    <div className="flex gap-5 items-center-safe">
      <input
        onChange={() => updateItemCompleted(position)}
        className="checkbox"
        type="checkbox"
        checked={completed}
      />
      <input
        onChange={(e) => updateItemText(position, e.target.value)}
        className="input"
        type="text"
        value={text}
      />
      <button
        onClick={() => deleteItem(position)}
        className="btn btn-error"
        type="button"
      >
        X
      </button>
    </div>
  );
}
