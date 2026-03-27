"use client";
import { useState } from "react";
import ChecklistItem from "./ChecklistItem";
import { ChecklistItemData } from "@/types/noteTypes";
import { createNote } from "@/actions/noteActions";

export default function NoteForm() {
  type NoteType = "text" | "checklist";
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState("text");
  const [body, setBody] = useState("");
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
      await fetch("/api/notes", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Note Form</legend>
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
                key={item.id}
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
          Save Note
        </button>
      </fieldset>
    </form>
  );
}
