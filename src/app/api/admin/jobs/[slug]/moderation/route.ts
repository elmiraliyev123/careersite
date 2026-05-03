import { NextResponse } from "next/server";

import { updateJobModerationStatus } from "@/lib/platform-database";;
import { normalizeJobModerationStatus } from "@/lib/moderation";
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
  const moderationStatus = normalizeJobModerationStatus(payload?.moderationStatus, "needs_review");
  const moderationNotes =
    typeof payload?.moderationNotes === "string" && payload.moderationNotes.trim().length > 0
      ? payload.moderationNotes.trim()
      : undefined;

  const job = updateJobModerationStatus(slug, moderationStatus, moderationNotes);

  if (!job) {
    return NextResponse.json({ message: "Vakansiya tapılmadı." }, { status: 404 });
  }

  return NextResponse.json({
    message: "Vakansiya statusu yeniləndi.",
    item: job
  });
}
