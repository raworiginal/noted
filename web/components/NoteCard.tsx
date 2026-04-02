import { NoteData } from "@/types/noteTypes";

type NoteCardProps = {
  note: NoteData;
};

export default function NoteCard({ note }: NoteCardProps) {
  return (
    <article className="card card-xs w-xs border border-accent">
      <div className="card-body">
        <h2 className="card-title">{note.title}</h2>
        {note.type === "text" ? (
          <p>{note.body}</p>
        ) : (
          note.items.map((i) => (
            <div key={i.id} className="flex gap-1">
              <input checked={i.completed} type="checkbox" />
              <p>{i.text}</p>
            </div>
          ))
        )}
      </div>
      <div className="card-actions flex justify-center">
        <button className="btn btn-xs" type="button">
          delete
        </button>
        <button className="btn btn-xs" type="button">
          edit
        </button>
      </div>
    </article>
  );
}
