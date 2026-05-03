import { NextResponse } from "next/server";

import { updateCompanyVisibility } from "@/lib/platform-database";
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

  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { visible?: unknown };
  const company = updateCompanyVisibility(slug, Boolean(body.visible));

  if (!company) {
    return NextResponse.json({ message: "Company was not found." }, { status: 404 });
  }

  return NextResponse.json({
    message: "Company visibility updated.",
    item: company
  });
}
