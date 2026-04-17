import { NextResponse } from "next/server";

import { listPipelineSmokeScenarios, runPipelineSmokeScenario, type PipelineSmokeScenario } from "@/lib/pipeline-smoke";
import { hasAdminSession } from "@/lib/session";
import { requireAdminMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isScenario(value: unknown): value is PipelineSmokeScenario {
  return value === "broken_link" || value === "unresolved_url" || value === "duplicate_pair";
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  return NextResponse.json({
    scenarios: listPipelineSmokeScenarios()
  });
}

export async function POST(request: Request) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const payload = await request.json().catch(() => ({}));
  const scenario = payload?.scenario;

  if (!isScenario(scenario)) {
    return NextResponse.json(
      {
        message: "Valid smoke scenario required.",
        scenarios: listPipelineSmokeScenarios()
      },
      { status: 400 }
    );
  }

  const result = await runPipelineSmokeScenario(scenario);
  return NextResponse.json(result);
}
