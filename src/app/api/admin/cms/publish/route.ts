import { NextResponse } from "next/server";
import { getCmsDocument, saveCmsDocument } from "@/lib/platform-database";
import { getSessionRole } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const existingDoc = getCmsDocument(documentId);
    
    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Publishing means copying draftData over publishedData
    saveCmsDocument(documentId, existingDoc.draftData, existingDoc.draftData);

    return NextResponse.json({ success: true, publishedData: existingDoc.draftData });
  } catch (error) {
    console.error("Error publishing CMS:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
