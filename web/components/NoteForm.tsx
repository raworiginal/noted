"use client";
import { useState } from "react";
import ChecklistItem from "./ChecklistItem";
import { ChecklistItemData } from "@/types/noteTypes";
import { redirect } from "next/navigation";
import { createNote } from "@/services/noteService";

export default function NoteForm() {
  type NoteType = "text" | "checklist";
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState("text");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([
    { completed: false, text: "", position: 0 },
  ]);
  const isEditing = false;

  function addItem() {
    const newItems = [
      ...items,
      { completed: false, text: "", position: items.length - 1 },
    ];
    setItems(newItems);
  }

  function deleteItem(index: number) {
    const currentItems = [...items];
    const updatedItems = currentItems.filter((_, idx) => idx !== index);
    setItems(updatedItems);
  }

  function updateItemCompleted(index: number) {
    const currentItems = [...items];
    if (currentItems[index].completed) {
      currentItems[index].completed = false;
    } else {
      currentItems[index].completed = true;
    }
    setItems(currentItems);
  }
  function updateItemText(index: number, text: string) {
    const currentItems = [...items];
    currentItems[index].text = text;
    setItems(currentItems);
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const data = {
      title: title,
      type: selected as NoteType,
      body: body,
      items: items,
    };
    if (selected === "text") {
      data.items = [];
    } else {
      data.body = "";
    }
    try {
      await createNote(data);
    } catch (error) {
      console.error(error);
      setError("failed to create note. Please try again.");
      return;
    } finally {
      setIsLoading(false);
    }

    redirect("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Note Form</legend>
        {error && <p className="alert alert-error alert-soft  ">{error}</p>}
        <label>Title</label>
        <input
          className="input"
          type="text"
          name="title"
          onChange={(e) => setTitle(e.target.value)}
          value={title}
        />
        {!isEditing && (
          <>
            <label>Type</label>
            <div className="join flex justify-center">
              <input
                className="join-item btn"
                type="radio"
                name="options"
                value="text"
                checked={selected === "text"}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="Text"
              />
              <input
                className="join-item btn"
                type="radio"
                name="options"
                value="checklist"
                checked={selected === "checklist"}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="Checklist"
              />
            </div>
          </>
        )}
        {selected === "text" ? (
          <>
            <label>Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="textarea"
            />
          </>
        ) : (
          <>
            <label>List</label>
            {items.map((item: ChecklistItemData, idx) => (
              <ChecklistItem
                key={idx}
                completed={item.completed}
                text={item.text}
                position={idx}
                deleteItem={deleteItem}
                updateItemCompleted={updateItemCompleted}
                updateItemText={updateItemText}
              />
            ))}
            <button type="button" className="btn" onClick={addItem}>
              + add item
            </button>
          </>
        )}
        <button className="btn btn-primary" type="submit">
          {isLoading ? <span className="loading-spinner"></span> : "save note"}
        </button>
      </fieldset>
    </form>
  );
}
