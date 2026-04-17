import { validateCandidateJobUrls } from "./src/lib/candidate-job-url-validator.ts";
import { buildRawJobIdentity } from "./src/lib/job-intelligence.ts";
import type { RawIngestedJob } from "./src/lib/job-intelligence.ts";

async function testBrokenLink() {
  console.log("\n--- Testing Broken/Expired Link ---");
  const result = await validateCandidateJobUrls({
    title: "Software Engineer",
    companyName: "Tech Corp",
    sourceReferenceUrl: "https://httpstat.us/404", // Will hit 404
    scrapedDetailUrl: "https://httpstat.us/404"
  });
  
  console.log("Validation Status:", result.validationStatus); // Expected: "rejected"
  console.log("Validation Reason:", result.validationReason); // Expected: "http_404"
  console.log("Needs Admin Review:", result.needsAdminReview); // Expected: false
  console.log("Final Verified URL:", result.finalVerifiedUrl || "null");
}

async function testDuplicates() {
  console.log("\n--- Testing Duplicates ---");
  const job1: RawIngestedJob = {
    sourceName: "Source A",
    sourceKind: "job-board",
    sourceListingUrl: "https://example.com/jobs",
    jobDetailUrl: "https://example.com/job/123",
    applyActionUrl: null,
    candidateApplyUrls: [],
    companyName: " PASHA Bank ", // Intentionally messy
    title: "Senior Developer",
    locationRaw: "Baku",
    postedAt: "2024-01-01",
    employmentType: "Full-time",
    descriptionRaw: "Need developer.",
    companySiteHint: "pashabank.az",
    scrapeConfidence: 0.9,
    scrapeError: null,
    payload: { adapter: "html-discovery" }
  };

  const job2: RawIngestedJob = {
    ...job1,
    sourceName: "Source B", // Different source
    sourceListingUrl: "https://other.com/listing",
    jobDetailUrl: "https://other.com/job/789", // Different URL
    companyName: "PASHA Bank", // Clean
    title: "  Senior Developer  " // Messy
  };

  // The deduper relies on buildRawJobIdentity mapping
  const jobs = [job1, job2];
  const dedupedRawJobs = Array.from(
    new Map(jobs.map((job) => [buildRawJobIdentity(job), job])).values()
  );

  console.log(`Original Job Count: ${jobs.length}`);
  console.log(`Deduped Job Count: ${dedupedRawJobs.length}`); // Expected 1
  console.log("Survivor Source:", dedupedRawJobs[0].sourceName);
}

async function testUnresolvedJob() {
  console.log("\n--- Testing Unresolved/Protected Link ---");
  const result = await validateCandidateJobUrls({
    title: "Protected Job",
    companyName: "Hidden Inc",
    sourceReferenceUrl: "https://httpstat.us/403", // Simulating Access Denied
    scrapedDetailUrl: "https://httpstat.us/403"
  });

  console.log("Validation Status:", result.validationStatus); // Expected: "unresolved"
  console.log("Validation Reason:", result.validationReason); // Expected: "access_denied" or "http_403"
  console.log("Needs Admin Review:", result.needsAdminReview); // Expected: true
  console.log("Final Verified URL:", result.finalVerifiedUrl || "null");
}

async function main() {
  await testBrokenLink();
  await testDuplicates();
  await testUnresolvedJob();
}

main().catch(console.error);
