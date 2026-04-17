import { revalidatePublishedJobApplyUrls } from "../src/lib/job-pipeline";

async function main() {
  const result = await revalidatePublishedJobApplyUrls({ force: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "job_revalidation_failed");
  process.exitCode = 1;
});
