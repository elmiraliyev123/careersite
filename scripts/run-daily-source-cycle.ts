import { runDailySourceCycle } from "../src/lib/scrape-sync";

async function main() {
  const result = await runDailySourceCycle();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "daily_source_cycle_failed");
  process.exitCode = 1;
});
