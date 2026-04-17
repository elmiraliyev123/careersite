"use client";

import React, { useRef, useState } from "react";
import { useCms } from "../cms-provider";
import { Image as ImageIcon, Upload } from "lucide-react";

type InlineImageProps = {
  contentKey: string;
  defaultSrc: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

export function InlineImage({ contentKey, defaultSrc, alt = "", className = "", width, height }: InlineImageProps) {
  const { isEditMode, draftData, setDraftDataValue } = useCms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const parts = contentKey.split(".");
  let currentSrc = draftData;
  for (const part of parts) {
    if (currentSrc) currentSrc = currentSrc[part];
  }
  
  const displaySrc = (typeof currentSrc === "string" && currentSrc) ? currentSrc : defaultSrc;

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

  if (!isEditMode) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={displaySrc} alt={alt} className={className} width={width} height={height} />;
  }

  return (
    <div 
      className={`inline-image-editable ${className}`}
      style={{ position: "relative", display: "inline-block", cursor: "pointer" }}
      onClick={() => fileInputRef.current?.click()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={displaySrc} 
        alt={alt} 
        width={width} 
        height={height} 
        style={{ opacity: isUploading ? 0.5 : 1, display: "block", maxWidth: "100%" }} 
      />
      
      <div 
        className="edit-overlay"
        style={{
          position: "absolute",
          inset: 0,
          border: "2px dashed #5D2DE1",
          backgroundColor: "rgba(93, 45, 225, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: "opacity 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
      >
        <div style={{ backgroundColor: "#5D2DE1", color: "white", padding: "8px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
          {isUploading ? <Upload size={14} className="animate-pulse" /> : <ImageIcon size={14} />}
          {isUploading ? "Uploading..." : "Replace Image"}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        style={{ display: "none" }}
      />
    </div>
  );
}
