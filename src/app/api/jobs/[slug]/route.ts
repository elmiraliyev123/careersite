import { NextResponse } from "next/server";

import { revalidatePublishedJobApplyUrls } from "@/lib/job-pipeline";
import { deleteJob, findJobBySlug, updateJob } from "@/lib/platform-database";
import { requireAdminMutation } from "@/lib/request-security";
import { validateJobInput } from "@/lib/platform-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  await revalidatePublishedJobApplyUrls({ slugs: [slug] }).catch(() => null);
  const job = findJobBySlug(slug);

  if (!job) {
    return NextResponse.json({ message: "Vakansiya tapılmadı." }, { status: 404 });
  }

  const { salary: _salary, ...rest } = job;
  return NextResponse.json({ item: rest });
}

export async function PUT(request: Request, context: RouteContext) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
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

export async function DELETE(request: Request, context: RouteContext) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const { slug } = await context.params;
  const deleted = deleteJob(slug);

  if (!deleted) {
    return NextResponse.json({ message: "Vakansiya tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({ message: "Vakansiya silindi." });
}
