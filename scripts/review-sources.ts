import { getScrapeSourceInventory } from "../src/lib/scrape-config";
import { reviewSourceComplianceBatch } from "../src/lib/source-compliance";

function parseArgs(argv: string[]) {
  const sourceIds: string[] = [];
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--force") {
      force = true;
      continue;
    }

    if (value === "--source") {
      const nextValue = argv[index + 1];
      if (nextValue) {
        sourceIds.push(nextValue);
        index += 1;
      }
    }
  }

  return { force, sourceIds };
}

async function main() {
  const { force, sourceIds } = parseArgs(process.argv.slice(2));
  const inventory = getScrapeSourceInventory();
  const sources =
    sourceIds.length > 0
      ? inventory.filter((source) => sourceIds.includes(source.id))
      : inventory;

  const reviews = await reviewSourceComplianceBatch(sources, { force });
  console.log(
    JSON.stringify(
      reviews.map((review) => ({
        sourceId: review.sourceId,
        sourceName: review.sourceName,
        legalReviewStatus: review.legalReviewStatus,
        allowedIngestionMethod: review.allowedIngestionMethod,
        termsUrl: review.termsUrl,
        privacyUrl: review.privacyUrl,
        robotsUrl: review.robotsUrl,
        lastLegalCheckedAt: review.lastLegalCheckedAt,
        legalReviewNotes: review.legalReviewNotes
      })),
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "source_review_failed");
  process.exitCode = 1;
});
