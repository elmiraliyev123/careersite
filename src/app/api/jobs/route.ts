import { NextResponse } from "next/server";

import { revalidatePublishedJobApplyUrls } from "@/lib/job-pipeline";
import { createJob, listJobs } from "@/lib/platform-database";
import { getFeaturedCompanies } from "@/lib/platform";
import { requireAdminMutation } from "@/lib/request-security";
import { validateJobInput } from "@/lib/platform-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await revalidatePublishedJobApplyUrls().catch(() => null);

  const jobs = listJobs().map((job) => {
    const { salary: _salary, ...rest } = job;
    return rest;
  });

  return NextResponse.json({
    total: jobs.length,
    items: jobs,
    featuredCompanyTotal: getFeaturedCompanies().length
  });
}

export async function POST(request: Request) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const payload = validateJobInput(await request.json());

  if (!payload.ok) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const job = createJob(payload.data);

  if (!job) {
    return NextResponse.json({ message: "Seçilən şirkət tapılmadı." }, { status: 404 });
  }

  return NextResponse.json(
    {
      message: job.featured
        ? "Vakansiya əlavə olundu və featured listings axınına düşdü."
        : "Vakansiya əlavə olundu. Featured listings üçün şirkəti featured etməlisən.",
      item: job
    },
    { status: 201 }
  );
}
