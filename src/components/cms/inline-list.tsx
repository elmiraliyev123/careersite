"use client";

import React, { useState } from "react";
import { useCms } from "../cms-provider";
import { List, Plus, Trash2, GripVertical, Check } from "lucide-react";

type InlineListProps = {
  contentKey: string;
  defaultItems: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemTemplate?: any;
  containerClassName?: string;
  listClassName?: string;
};

export function InlineList({
  contentKey,
  defaultItems,
  renderItem,
  itemTemplate = "",
  containerClassName = "",
  listClassName = ""
}: InlineListProps) {
  const { isEditMode, draftData, setDraftDataValue } = useCms();
  const [isEditing, setIsEditing] = useState(false);

  const parts = contentKey.split(".");
  let currentList = draftData;
  for (const part of parts) {
    if (currentList) currentList = currentList[part];
  }
  
  const items = Array.isArray(currentList) ? currentList : defaultItems;

  const handleUpdateItem = (index: number, newValue: any) => {
    const newItems = [...items];
    newItems[index] = newValue;
    setDraftDataValue(contentKey, newItems);
  };

  const handleAddItem = () => {
    const newItems = [...items, typeof itemTemplate === "function" ? itemTemplate() : itemTemplate];
    setDraftDataValue(contentKey, newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setDraftDataValue(contentKey, newItems);
  };

  const moveItem = (index: number, dir: 1 | -1) => {
    if (index + dir < 0 || index + dir >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + dir];
    newItems[index + dir] = temp;
    setDraftDataValue(contentKey, newItems);
  };

  if (!isEditMode) {
    return (
      <div className={containerClassName}>
        <div className={listClassName}>
          {items.map((item, i) => renderItem(item, i))}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName} style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: -30, right: 0, zIndex: 10 }}>
        <button
          title="Edit List"
          onClick={() => setIsEditing(!isEditing)}
          style={{
            backgroundColor: isEditing ? "#5D2DE1" : "white",
            color: isEditing ? "white" : "#5D2DE1",
            border: "1px solid #5D2DE1",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          {isEditing ? <Check size={14} /> : <List size={14} />}
          {isEditing ? "Done" : "Edit List"}
        </button>
      </div>

      {isEditing ? (
        <div style={{ border: "2px dashed #5D2DE1", padding: 16, borderRadius: 12, backgroundColor: "rgba(93, 45, 225, 0.02)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", backgroundColor: "white", padding: 8, borderRadius: 8, border: "1px solid #E6DDFB" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{ border: "none", background: "none", cursor: i === 0 ? "not-allowed" : "pointer", padding: 2 }}>↑</button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} style={{ border: "none", background: "none", cursor: i === items.length - 1 ? "not-allowed" : "pointer", padding: 2 }}>↓</button>
                </div>
                
                <div style={{ flex: 1 }}>
                  {typeof item === "string" ? (
                    <input
                      value={item}
                      onChange={(e) => handleUpdateItem(i, e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", border: "1px solid #E6DDFB", borderRadius: 4 }}
                    />
                  ) : (
                    <textarea 
                      value={JSON.stringify(item, null, 2)}
                      onChange={(e) => {
                        try {
                          handleUpdateItem(i, JSON.parse(e.target.value));
                        } catch(e) {} // ignore invalid json while typing
                      }}
                      style={{ width: "100%", padding: "6px 8px", border: "1px solid #E6DDFB", borderRadius: 4, minHeight: 80, fontFamily: "monospace", fontSize: 12 }}
                    />
                  )}
                </div>
                
                <button 
                  onClick={() => handleRemoveItem(i)}
                  style={{ border: "none", background: "rgba(225, 45, 93, 0.1)", color: "#e12d5d", padding: 8, borderRadius: 6, cursor: "pointer" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <button 
            onClick={handleAddItem}
            style={{ marginTop: 16, width: "100%", padding: 12, border: "1px dashed #5D2DE1", borderRadius: 8, background: "transparent", color: "#5D2DE1", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
      ) : (
        <div className={listClassName}>
          {items.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </div>
  );
}
