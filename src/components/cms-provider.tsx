"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

type CmsContextType = {
  isAdmin: boolean;
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  publishedData: Record<string, any>;
  draftData: Record<string, any>;
  setDraftDataValue: (key: string, value: any) => void;
  saveDraft: () => Promise<void>;
  publishChanges: () => Promise<void>;
  hasUnsavedChanges: boolean;
};

const CmsContext = createContext<CmsContextType | null>(null);

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return context;
}

export function CmsProvider({
  children,
  isAdmin,
  initialPublishedData = {},
  initialDraftData = {},
}: {
  children: ReactNode;
  isAdmin: boolean;
  initialPublishedData?: Record<string, any>;
  initialDraftData?: Record<string, any>;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [publishedData] = useState(initialPublishedData);
  const [draftData, setDraftData] = useState(initialDraftData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isEditModeRoute = pathname.startsWith("/admin/edit/mode");
  const actualIsAdmin = isAdmin && isEditModeRoute;
  const activeDraftData = isEditModeRoute ? draftData : publishedData;

  const setDraftDataValue = useCallback((key: string, value: any) => {
    setDraftData((prev) => {
      const parts = key.split(".");
      const newDraft = { ...prev };
      let current = newDraft;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        current[part] = current[part] ? { ...current[part] } : {};
        current = current[part];
      }
      current[parts[parts.length - 1]] = value;
      return newDraft;
    });
    setHasUnsavedChanges(true);
  }, []);

  const saveDraft = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cms/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "site-content", updates: draftData }),
      });
      if (res.ok) {
        setHasUnsavedChanges(false);
        router.refresh();
      } else {
        console.error("Failed to save draft");
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftData, router]);

  const publishChanges = useCallback(async () => {
    try {
      // Auto-save draft before publishing just in case
      if (hasUnsavedChanges) {
        await saveDraft();
      }
      const res = await fetch("/api/admin/cms/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "site-content" }),
      });
      if (res.ok) {
        setHasUnsavedChanges(false);
        router.refresh(); // causes layout to refetch published data
      } else {
        console.error("Failed to publish");
      }
    } catch (e) {
      console.error(e);
    }
  }, [hasUnsavedChanges, saveDraft, router]);

  return (
    <CmsContext.Provider
      value={{
        isAdmin: actualIsAdmin,
        isEditMode: actualIsAdmin && isEditMode,
        setIsEditMode,
        publishedData,
        draftData: activeDraftData,
        setDraftDataValue,
        saveDraft,
        publishChanges,
        hasUnsavedChanges,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
}
