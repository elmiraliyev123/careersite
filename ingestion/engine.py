from __future__ import annotations

import asyncio
from collections import defaultdict

import httpx

from .categorization import build_company_categorization_prompt
from .enrichment import build_clearbit_logo_url, fetch_wikipedia_summary, resolve_official_domain
from .models import CompanyEnrichment, JobPosting, RunResult, utc_now_iso
from .sources import BaseSource, default_sources

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    )
}


class ScraperEngine:
    def __init__(self, sources: list[BaseSource], timeout_seconds: float = 25.0) -> None:
        self.sources = sources
        self.timeout_seconds = timeout_seconds

    async def run(self) -> RunResult:
        started_at = utc_now_iso()
        jobs: list[JobPosting] = []
        errors: list[str] = []

        async with httpx.AsyncClient(
            headers=DEFAULT_HEADERS,
            timeout=self.timeout_seconds,
            follow_redirects=True,
        ) as client:
            batches = await asyncio.gather(
                *(source.collect_jobs(client) for source in self.sources),
                return_exceptions=True,
            )

        for source, batch in zip(self.sources, batches, strict=True):
            if isinstance(batch, Exception):
                errors.append(f"{source.config.source_id}: {batch}")
                continue

            jobs.extend(batch)

        companies = self._build_company_enrichments(jobs)
        return RunResult(
            started_at=started_at,
            finished_at=utc_now_iso(),
            jobs=jobs,
            companies=companies,
            errors=errors,
        )

    def _build_company_enrichments(self, jobs: list[JobPosting]) -> list[CompanyEnrichment]:
        company_jobs: dict[str, list[JobPosting]] = defaultdict(list)
        for job in jobs:
            company_jobs[job.company_name].append(job)

        enrichments: list[CompanyEnrichment] = []

        for company_name, company_postings in company_jobs.items():
            candidate_urls = [
                value
                for posting in company_postings
                for value in (posting.company_site_hint, posting.source_url)
                if value
            ]
            description_text = " ".join(
                posting.description_text for posting in company_postings if posting.description_text
            ).strip()
            official_domain = resolve_official_domain(
                company_name=company_name,
                website_hint=company_postings[0].company_site_hint,
                candidate_urls=candidate_urls,
            )
            wikipedia = fetch_wikipedia_summary(company_name)

            enrichments.append(
                CompanyEnrichment(
                    canonical_name=company_name,
                    official_domain=official_domain,
                    official_website_url=f"https://{official_domain}" if official_domain else None,
                    clearbit_logo_url=build_clearbit_logo_url(official_domain),
                    wikipedia_summary=wikipedia["summary"] if wikipedia else None,
                    wikipedia_source_url=wikipedia["source_url"] if wikipedia else None,
                    categorization_prompt=build_company_categorization_prompt(
                        company_name=company_name,
                        description_text=description_text or company_name,
                    ),
                )
            )

        return enrichments


async def run_default_ingestion() -> RunResult:
    engine = ScraperEngine(
        default_sources(
            extra_career_pages={
                "Kapital Bank": ("https://kapitalbank.az/careers",),
                "PASHA Insurance": ("https://pasha-insurance.az/career",),
            }
        )
    )
    return await engine.run()
