import { inspectRawJobs, previewRawJobs, type CandidateInspectionResult } from "@/lib/job-pipeline";
import type { RawIngestedJob } from "@/lib/job-intelligence";

export type PipelineSmokeScenario = "broken_link" | "unresolved_url" | "duplicate_pair";

type SmokeFixture = {
  description: string;
  jobs: RawIngestedJob[];
};

function buildBaseJob(overrides: Partial<RawIngestedJob>): RawIngestedJob {
  return {
    sourceName: "Pipeline Smoke Test",
    sourceKind: "job-board",
    sourceListingUrl: "https://smoke-test.local/jobs",
    jobDetailUrl: null,
    applyActionUrl: null,
    candidateApplyUrls: null,
    externalApplyUrl: null,
    companyName: "AzerTest Labs",
    title: "Junior QA Engineer",
    locationRaw: "Bakı, Azərbaycan",
    postedAt: "2026-04-09",
    employmentType: "Tam ştat",
    descriptionRaw: "Junior quality assurance role for Azerbaijan-focused hiring smoke tests.",
    companySiteHint: "https://azertest.example",
    scrapeConfidence: 0.9,
    scrapeError: null,
    payload: { smoke: true, scenario: "base" },
    ...overrides
  };
}

function getScenarioFixture(scenario: PipelineSmokeScenario): SmokeFixture {
  switch (scenario) {
    case "broken_link":
      return {
        description: "Reachable URL that fails with 404 and must be rejected/unresolved for publishing.",
        jobs: [
          buildBaseJob({
            title: "Junior QA Engineer",
            sourceName: "Broken Link Fixture",
            sourceListingUrl: "https://fixture.local/broken-link",
            jobDetailUrl: "https://httpstat.us/404",
            payload: { smoke: true, scenario }
          })
        ]
      };
    case "unresolved_url":
      return {
        description: "DNS-failed host that must remain unresolved with no verified outbound URL.",
        jobs: [
          buildBaseJob({
            title: "Junior Data Analyst",
            sourceName: "Unresolved URL Fixture",
            sourceListingUrl: "https://fixture.local/unresolved-url",
            jobDetailUrl: "https://careers.az.invalid/jobs/12345",
            payload: { smoke: true, scenario }
          })
        ]
      };
    case "duplicate_pair":
      return {
        description: "Two records for the same vacancy from different sources that should collapse into one primary plus one duplicate.",
        jobs: [
          buildBaseJob({
            title: "Junior Product Analyst",
            sourceName: "Duplicate Fixture A",
            sourceListingUrl: "https://fixture.local/duplicate-a",
            jobDetailUrl: "https://careers.az.invalid/jobs/duplicate-a",
            payload: { smoke: true, scenario, variant: "a" }
          }),
          buildBaseJob({
            title: "Junior Product Analyst",
            sourceName: "Duplicate Fixture B",
            sourceListingUrl: "https://fixture.local/duplicate-b",
            jobDetailUrl: "https://careers.az.invalid/jobs/duplicate-b",
            payload: { smoke: true, scenario, variant: "b" }
          })
        ]
      };
  }
}

export function listPipelineSmokeScenarios() {
  return (["broken_link", "unresolved_url", "duplicate_pair"] as PipelineSmokeScenario[]).map((scenario) => ({
    scenario,
    description: getScenarioFixture(scenario).description
  }));
}

export async function runPipelineSmokeScenario(scenario: PipelineSmokeScenario): Promise<{
  scenario: PipelineSmokeScenario;
  description: string;
  preview: Awaited<ReturnType<typeof previewRawJobs>>;
  inspections: CandidateInspectionResult[];
}> {
  const fixture = getScenarioFixture(scenario);
  const preview = await previewRawJobs(fixture.jobs);
  const inspections = await inspectRawJobs(fixture.jobs);

  return {
    scenario,
    description: fixture.description,
    preview,
    inspections
  };
}
