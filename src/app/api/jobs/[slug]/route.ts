import { NextResponse } from "next/server";

import { deleteJob, findJobBySlug, updateJob } from "@/lib/platform-database";
import { hasAdminSession } from "@/lib/session";
import { validateJobInput } from "@/lib/platform-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const job = findJobBySlug(slug);

  if (!job) {
    return NextResponse.json({ message: "Vakansiya tapılmadı." }, { status: 404 });
  }

  const { salary: _salary, ...rest } = job;
  return NextResponse.json({ item: rest });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const { slug } = await context.params;
  const payload = validateJobInput(await request.json());

  if (!payload.ok) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const job = updateJob(slug, payload.data);

  if (!job) {
    return NextResponse.json({ message: "Vakansiya və ya bağlı şirkət tapılmadı." }, { status: 404 });
  }

  const { salary: _salary, ...rest } = job;
  return NextResponse.json({
    message: "Vakansiya yeniləndi.",
    item: rest
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const { slug } = await context.params;
  const deleted = deleteJob(slug);

  if (!deleted) {
    return NextResponse.json({ message: "Vakansiya tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({ message: "Vakansiya silindi." });
}
