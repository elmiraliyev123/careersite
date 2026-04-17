import { nowIsoTimestamp, type NormalizedJobCandidate, type RawIngestedJob } from "@/lib/job-intelligence";

type AiJobEnrichment = {
  internshipConfidence?: number;
  isInternship?: boolean;
  locationConfidence?: number;
  isBaku?: boolean;
  rejectionCategory?: string | null;
  notes?: string[];
};

type OpenAiResponse = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_RESPONSES_MODEL?.trim();

  if (!apiKey || !model) {
    return null;
  }

  return { apiKey, model };
}

function shouldRequestAiReview(candidate: NormalizedJobCandidate) {
  const internshipBorderline =
    candidate.internshipConfidence >= 0.35 && candidate.internshipConfidence <= 0.72;
  const locationBorderline = candidate.locationConfidence >= 0.2 && candidate.locationConfidence <= 0.7;

  return internshipBorderline || locationBorderline;
}

function buildPrompt(input: {
  raw: RawIngestedJob;
  candidate: NormalizedJobCandidate;
}) {
  return `
You are validating an early-career job listing for a high-trust internship discovery feed focused on Baku and Azerbaijan.

Return strict JSON with this exact schema:
{
  "internshipConfidence": number,
  "isInternship": boolean,
  "locationConfidence": number,
  "isBaku": boolean,
  "rejectionCategory": string | null,
  "notes": string[]
}

Rules:
- Be conservative. Never promote a weak or unclear role.
- Senior, lead, manager, director, or training/course ads should be rejected.
- Baku means clearly in Baku, hybrid in Baku, or remote but explicitly Azerbaijan-relevant.
- If unsure, lower confidence.

Job title: ${input.raw.title}
Company: ${input.raw.companyName}
Location raw: ${input.raw.locationRaw ?? "unknown"}
Employment type: ${input.raw.employmentType ?? "unknown"}
Description: ${input.raw.descriptionRaw ?? "none"}

Current rule-based output:
- seniorityLevel: ${input.candidate.seniorityLevel}
- internshipConfidence: ${input.candidate.internshipConfidence}
- isInternship: ${input.candidate.isInternship}
- locationConfidence: ${input.candidate.locationConfidence}
- isBaku: ${input.candidate.isBaku}
- rejectionCategory: ${input.candidate.rejectionCategory ?? "none"}
  `.trim();
}

function extractTextPayload(response: OpenAiResponse) {
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
}

export async function maybeEnrichCandidateWithAi(input: {
  raw: RawIngestedJob;
  candidate: NormalizedJobCandidate;
}): Promise<AiJobEnrichment | null> {
  const config = getAiConfig();

  if (!config || !shouldRequestAiReview(input.candidate)) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        input: buildPrompt(input),
        text: {
          format: {
            type: "json_schema",
            name: "job_quality_enrichment",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                internshipConfidence: { type: "number" },
                isInternship: { type: "boolean" },
                locationConfidence: { type: "number" },
                isBaku: { type: "boolean" },
                rejectionCategory: { type: ["string", "null"] },
                notes: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: [
                "internshipConfidence",
                "isInternship",
                "locationConfidence",
                "isBaku",
                "rejectionCategory",
                "notes"
              ]
            }
          }
        }
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as OpenAiResponse;
    const text = extractTextPayload(payload);

    if (!text) {
      return null;
    }

    const parsed = JSON.parse(text) as AiJobEnrichment;
    return {
      internshipConfidence:
        typeof parsed.internshipConfidence === "number" ? parsed.internshipConfidence : undefined,
      isInternship: typeof parsed.isInternship === "boolean" ? parsed.isInternship : undefined,
      locationConfidence:
        typeof parsed.locationConfidence === "number" ? parsed.locationConfidence : undefined,
      isBaku: typeof parsed.isBaku === "boolean" ? parsed.isBaku : undefined,
      rejectionCategory:
        typeof parsed.rejectionCategory === "string" || parsed.rejectionCategory === null
          ? parsed.rejectionCategory
          : null,
      notes: Array.isArray(parsed.notes) ? parsed.notes.filter((note): note is string => typeof note === "string") : []
    };
  } catch (error) {
    console.info(
      JSON.stringify({
        scope: "job_intelligence",
        event: "ai_enrichment_skipped",
        timestamp: nowIsoTimestamp(),
        reason: error instanceof Error ? error.message : "ai_enrichment_failed"
      })
    );
    return null;
  }
}
