"use client";

import { useCms } from "./cms-provider";

export function AdminEditToolbar() {
  const { isAdmin, isEditMode, setIsEditMode, hasUnsavedChanges, saveDraft, publishChanges } = useCms();

  if (!isAdmin) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        backgroundColor: "rgba(42, 16, 90, 0.95)",
        color: "white",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 999999,
        fontFamily: "var(--font-geist-sans), sans-serif",
        border: "1px solid #5D2DE1"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, borderRight: "1px solid rgba(255,255,255,0.2)", paddingRight: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Admin</span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isEditMode}
            onChange={(e) => setIsEditMode(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Edit Mode
        </label>
      </div>

      {isEditMode && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={saveDraft}
            disabled={!hasUnsavedChanges}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.2)",
              backgroundColor: hasUnsavedChanges ? "white" : "transparent",
              color: hasUnsavedChanges ? "#2f1363" : "rgba(255,255,255,0.5)",
              fontSize: 13,
              fontWeight: 600,
              cursor: hasUnsavedChanges ? "pointer" : "not-allowed",
              transition: "all 0.2s"
            }}
          >
            {hasUnsavedChanges ? "Save Draft" : "Saved"}
          </button>
          
          <button
            onClick={publishChanges}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#5D2DE1",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "filter 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            Publish Live
          </button>
        </div>
      )}
    </div>
  );
}
