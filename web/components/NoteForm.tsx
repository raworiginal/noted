export default function NoteForm() {
  return (
    <form>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Note Form</legend>
        <label>Title</label>
        <label>Type</label>

        <label>Body</label>
        <textarea></textarea>
        <label></label>
      </fieldset>
    </form>
  );
}
