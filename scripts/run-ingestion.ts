import { getScrapeSourceInventory } from "../src/lib/scrape-config";
import { syncScrapedJobs } from "../src/lib/scrape-sync";

function parseArgs(argv: string[]) {
  const sourceIds: string[] = [];
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--dry-run") {
      dryRun = true;
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

  return { dryRun, sourceIds };
}

async function main() {
  const { dryRun, sourceIds } = parseArgs(process.argv.slice(2));
  const inventory = getScrapeSourceInventory();

  if (sourceIds.length > 0) {
    const invalid = sourceIds.filter((sourceId) => !inventory.some((source) => source.id === sourceId));
    if (invalid.length > 0) {
      throw new Error(`Unknown source ids: ${invalid.join(", ")}`);
    }
  }

  const result = await syncScrapedJobs({
    dryRun,
    sourceIds: sourceIds.length > 0 ? sourceIds : undefined
  });

  console.log(
    JSON.stringify(
      {
        message: result.message,
        dryRun: result.dryRun,
        totalScraped: result.totalScraped,
        importedCount: result.importedCount,
        matchedCount: result.matchedCount,
        run: result.run ?? null,
        sources: result.sources.map((source) => ({
          id: source.id,
          scrapedCount: source.scrapedCount,
          extractionReady: source.extractionReady
        })),
        errors: result.errors
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "job_ingestion_failed");
  process.exitCode = 1;
});
