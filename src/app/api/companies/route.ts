import { NextResponse } from "next/server";

import { createCompany, listCompanies } from "@/lib/platform-database";
import { hasAdminSession } from "@/lib/session";
import { validateCompanyInput } from "@/lib/platform-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const companies = listCompanies();

  return NextResponse.json({
    total: companies.length,
    items: companies
  });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const payload = validateCompanyInput(await request.json());

  if (!payload.ok) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const company = createCompany(payload.data);

  return NextResponse.json(
    {
      message: "Şirkət profili yaradıldı.",
      item: company
    },
    { status: 201 }
  );
}
