import { NoteData } from "@/types/noteTypes";
type NoteCardProps = {
  note: NoteData;
};
export default function NoteCard({ note }: NoteCardProps) {
  if (note.type === "text") {
    return (
      <article className="card card-border card-xl w-96">
        <h2 className="card-title">{note.title}</h2>
        <p className="card-body">{note.body}</p>
      </article>
    );
  } else {
    return (
      <article className="card card-border">
        <h2 className="card-title">{note.title}</h2>
        <div className="card-body">
          {note.items?.map((item) => (
            <div className="flex gap-1">
              <input type="checkbox" />
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </article>
    );
  }
}
