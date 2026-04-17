import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireAdminMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadDirectory = path.join(process.cwd(), "public", "uploads", "company-logos");
const allowedMimeTypes = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"]
]);

export async function POST(request: Request) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Logo faylı tapılmadı." }, { status: 400 });
  }

  const extension = allowedMimeTypes.get(file.type);

  if (!extension) {
    return NextResponse.json({ message: "Yalnız PNG, JPG və WEBP faylları qəbul olunur." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ message: "Logo faylı 5MB-dan böyük ola bilməz." }, { status: 400 });
  }

  await fs.mkdir(uploadDirectory, { recursive: true });

  const fileName = `${randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(filePath, buffer);

  return NextResponse.json({
    url: `/uploads/company-logos/${fileName}`
  });
}
