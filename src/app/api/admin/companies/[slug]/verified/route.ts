import { NextResponse } from "next/server";

import { updateCompanyVerified } from "@/lib/platform-database";
import { requireAdminMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const payload = await request.json();
  const { slug } = await context.params;
  const verified = Boolean(payload?.verified);
  const company = updateCompanyVerified(slug, verified);

  if (!company) {
    return NextResponse.json({ message: "Şirkət tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({
    message: "Şirkət statusu yeniləndi.",
    item: company
  });
}
