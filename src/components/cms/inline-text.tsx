"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCms } from "../cms-provider";
import { Edit2 } from "lucide-react";

type InlineTextProps = {
  contentKey: string;
  defaultValue: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
};

export function InlineText({ contentKey, defaultValue, as: Component = "span", className = "", multiline = false }: InlineTextProps) {
  const { isEditMode, draftData, setDraftDataValue } = useCms();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Resolve current value from draftData (which falls back to publishedData initially if not drafted)
  // Our Context should ideally seed draftData with publishedData on start.
  const parts = contentKey.split(".");
  let currentValue = draftData;
  for (const part of parts) {
    if (currentValue) currentValue = currentValue[part];
  }
  const displayValue = (typeof currentValue === "string" ? currentValue : defaultValue);
  const [localValue, setLocalValue] = useState(displayValue);

  // Sync display if external changes happen
  useEffect(() => {
    setLocalValue(displayValue);
  }, [displayValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (localValue !== displayValue) {
      setDraftDataValue(contentKey, localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    }
    if (e.key === "Escape") {
      setLocalValue(displayValue);
      setIsEditing(false);
    }
  };

  if (!isEditMode) {
    return <Component className={className}>{displayValue}</Component>;
  }

  return (
    <Component 
      className={`${className} inline-editable`} 
      style={{ position: "relative", display: "inline-block" }}
      onDoubleClick={() => setIsEditing(true)}
    >
      {isEditing ? (
        multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            style={{ 
              width: "100%", 
              minHeight: "80px", 
              fontFamily: "inherit",
              fontSize: "inherit", 
              padding: "4px",
              boxSizing: "border-box"
            }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            style={{ 
              width: "100%", 
              fontFamily: "inherit",
              fontSize: "inherit", 
              padding: "2px 4px",
              boxSizing: "border-box"
            }}
          />
        )
      ) : (
        <div style={{ position: "relative", padding: "2px 0" }}>
          {displayValue}
          <div 
            className="edit-overlay"
            style={{
              position: "absolute",
              inset: -4,
              border: "1px dashed #5D2DE1",
              borderRadius: 4,
              backgroundColor: "rgba(93, 45, 225, 0.05)",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              padding: 4,
              opacity: 0,
              transition: "opacity 0.2s"
            }}
            onClick={() => setIsEditing(true)}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
          >
            <Edit2 size={12} color="#5D2DE1" />
          </div>
        </div>
      )}
    </Component>
  );
}
