import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/session";
import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("md5").update(buffer).digest("hex").substring(0, 8);
    const extension = path.extname(file.name) || ".png";
    const filename = `cms-${hash}${extension}`;
    
    const publicDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
