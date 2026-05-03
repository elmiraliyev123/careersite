import { NextResponse } from "next/server";

import { getCompanies } from "@/lib/platform";
import { createCompany } from "@/lib/db";;
import { requireAdminMutation } from "@/lib/request-security";
import { validateCompanyInput } from "@/lib/platform-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const companies = await getCompanies();

  return NextResponse.json({
    total: companies.length,
    items: companies
  });
}

export async function POST(request: Request) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const payload = validateCompanyInput(await request.json());

  if (!payload.ok) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const company = await createCompany(payload.data);

  return NextResponse.json(
    {
      message: "Şirkət profili yaradıldı.",
      item: company
    },
    { status: 201 }
  );
}
