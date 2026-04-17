"use client";

import React, { useRef, useState } from "react";
import { useCms } from "../cms-provider";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";

type InlineBackgroundProps = {
  contentKey: string;
  defaultImage?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
};

export function InlineBackground({ contentKey, defaultImage, children, className = "", style = {}, as: Component = "div" }: InlineBackgroundProps) {
  const { isEditMode, draftData, setDraftDataValue } = useCms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const parts = contentKey.split(".");
  let currentSrc = draftData;
  for (const part of parts) {
    if (currentSrc) currentSrc = currentSrc[part];
  }

  // If currentSrc strictly === null, admin removed it.
  // If undefined or empty array or empty string, fallback to defaultImage.
  const hasDbEntry = currentSrc !== undefined;
  const activeImage = hasDbEntry ? currentSrc : defaultImage;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setDraftDataValue(contentKey, data.url);
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftDataValue(contentKey, null);
  };

  const bgStyle = activeImage ? { backgroundImage: `url('${activeImage}')` } : {};
  const combinedStyle = { ...style, ...bgStyle };

  return (
    <Component
      className={`${className} inline-background-container ${isEditMode ? "edit-mode-active" : ""}`}
      style={{ ...combinedStyle, position: combinedStyle.position || "relative" }}
    >
      {children}

      {isEditMode && (
        <>
          <div
            className="edit-background-overlay"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 50,
              display: "flex",
              gap: 8,
              opacity: 0.3,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: "#5D2DE1",
                color: "white",
                padding: "8px 12px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              {isUploading ? <Upload size={14} className="animate-pulse" /> : <ImageIcon size={14} />}
              {isUploading ? "Uploading..." : "Replace Background"}
            </button>

            {activeImage && (
              <button
                onClick={handleRemove}
                style={{
                  backgroundColor: "white",
                  color: "#e12d5d",
                  padding: "8px 12px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid #e12d5d",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
        </>
      )}
    </Component>
  );
}
