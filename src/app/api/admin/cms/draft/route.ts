import { NextResponse } from "next/server";
import { getCmsDocument, saveCmsDocument } from "@/lib/platform-database";;
import { getSessionRole } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, updates } = await request.json();

    if (!documentId || !updates) {
      return NextResponse.json({ error: "Missing documentId or updates" }, { status: 400 });
    }

    const existingDoc = getCmsDocument(documentId);
    
    // Merge updates into existing draft data
    const newDraftData = {
      ...(existingDoc?.draftData || {}),
      ...updates
    };

    saveCmsDocument(documentId, newDraftData, existingDoc?.publishedData);

    return NextResponse.json({ success: true, draftData: newDraftData });
  } catch (error) {
    console.error("Error saving CMS draft:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
