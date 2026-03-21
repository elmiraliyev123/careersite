import { NextResponse } from "next/server";

import {
  deleteCompany,
  findCompanyBySlug,
  updateCompany
} from "@/lib/platform-database";
import { hasAdminSession } from "@/lib/session";
import { validateCompanyInput } from "@/lib/platform-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const company = findCompanyBySlug(slug);

  if (!company) {
    return NextResponse.json({ message: "Şirkət tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({ item: company });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const { slug } = await context.params;
  const payload = validateCompanyInput(await request.json());

  if (!payload.ok) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const company = updateCompany(slug, payload.data);

  if (!company) {
    return NextResponse.json({ message: "Şirkət tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({
    message: "Şirkət profili yeniləndi.",
    item: company
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const { slug } = await context.params;
  const result = deleteCompany(slug);

  if (!result.deleted) {
    return NextResponse.json({ message: "Şirkət tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({
    message:
      result.relatedJobCount > 0
        ? `Şirkət silindi və bağlı ${result.relatedJobCount} vakansiya da arxivdən çıxarıldı.`
        : "Şirkət silindi."
  });
}
