from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup
import httpx

from .models import JobPosting


@dataclass(slots=True)
class SourceConfig:
    source_id: str
    name: str
    kind: str
    seed_urls: tuple[str, ...]
    job_link_selector: str | None = None
    company_name_override: str | None = None


def flatten_json_ld(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        nodes: list[dict[str, Any]] = []
        for item in payload:
            nodes.extend(flatten_json_ld(item))
        return nodes

    if not isinstance(payload, dict):
        return []

    if isinstance(payload.get("@graph"), list):
        nodes: list[dict[str, Any]] = []
        for item in payload["@graph"]:
            nodes.extend(flatten_json_ld(item))
        return nodes

    return [payload]


def clean_text(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(item for item in (clean_text(entry) for entry in value) if item)
    if isinstance(value, dict):
        return ", ".join(item for item in (clean_text(entry) for entry in value.values()) if item)
    if isinstance(value, str):
        return BeautifulSoup(value, "html.parser").get_text(" ", strip=True)
    return ""


class BaseSource:
    def __init__(self, config: SourceConfig) -> None:
        self.config = config

    async def fetch_html(self, client: httpx.AsyncClient, url: str) -> str:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.text

    def extract_jobs_from_json_ld(self, html: str, page_url: str) -> list[JobPosting]:
        soup = BeautifulSoup(html, "html.parser")
        jobs: list[JobPosting] = []

        for script in soup.select("script[type='application/ld+json']"):
            raw_payload = (script.string or script.get_text(strip=True)).strip()
            if not raw_payload:
                continue

            try:
                payload = json.loads(raw_payload)
            except json.JSONDecodeError:
                continue

            for node in flatten_json_ld(payload):
                node_type = str(node.get("@type", "")).casefold()
                if node_type != "jobposting":
                    continue

                title = clean_text(node.get("title"))
                company_name = clean_text((node.get("hiringOrganization") or {}).get("name")) or (
                    self.config.company_name_override or ""
                )
                source_url = node.get("url") or page_url

                if not title or not company_name or not source_url:
                    continue

                jobs.append(
                    JobPosting(
                        source_id=self.config.source_id,
                        source_kind=self.config.kind,
                        source_url=urljoin(page_url, str(source_url)),
                        company_name=company_name,
                        title=title,
                        location_text=clean_text((node.get("jobLocation") or {}).get("address")),
                        description_text=clean_text(node.get("description")),
                        posted_at=clean_text(node.get("datePosted")) or None,
                        employment_type=clean_text(node.get("employmentType")) or None,
                        company_site_hint=clean_text((node.get("hiringOrganization") or {}).get("sameAs")) or None,
                        payload=node,
                    )
                )

        return jobs

    def extract_jobs_from_links(self, html: str, page_url: str) -> list[JobPosting]:
        if not self.config.job_link_selector:
            return []

        soup = BeautifulSoup(html, "html.parser")
        jobs: list[JobPosting] = []
        seen_urls: set[str] = set()

        for anchor in soup.select(self.config.job_link_selector):
            href = anchor.get("href")
            title = clean_text(anchor.get_text(" ", strip=True))
            source_url = urljoin(page_url, href) if href else ""

            if not href or not title or source_url in seen_urls:
                continue

            seen_urls.add(source_url)
            jobs.append(
                JobPosting(
                    source_id=self.config.source_id,
                    source_kind=self.config.kind,
                    source_url=source_url,
                    company_name=self.config.company_name_override or self.config.name,
                    title=title,
                    payload={"discovered_via": "link_selector", "page_url": page_url},
                )
            )

        return jobs

    def parse_jobs(self, html: str, page_url: str) -> list[JobPosting]:
        jobs = self.extract_jobs_from_json_ld(html, page_url)
        return jobs or self.extract_jobs_from_links(html, page_url)

    async def collect_jobs(self, client: httpx.AsyncClient) -> list[JobPosting]:
        jobs: list[JobPosting] = []

        for seed_url in self.config.seed_urls:
            html = await self.fetch_html(client, seed_url)
            jobs.extend(self.parse_jobs(html, seed_url))

        deduped: dict[str, JobPosting] = {}
        for job in jobs:
            deduped[job.source_url] = job
        return list(deduped.values())


class HelloJobAzSource(BaseSource):
    def __init__(self) -> None:
        super().__init__(
            SourceConfig(
                source_id="hellojob.az",
                name="HelloJob.az",
                kind="job-board",
                seed_urls=("https://hellojob.az/jobs",),
                job_link_selector="a[href*='/job/'], a[href*='/vacancy/']",
            )
        )


class BossAzSource(BaseSource):
    def __init__(self) -> None:
        super().__init__(
            SourceConfig(
                source_id="boss.az",
                name="Boss.az",
                kind="job-board",
                seed_urls=("https://boss.az/jobs",),
                job_link_selector="a[href*='/vacancies/'], a[href*='/jobs/']",
            )
        )


class CareerPageSource(BaseSource):
    def __init__(self, company_name: str, career_urls: tuple[str, ...]) -> None:
        super().__init__(
            SourceConfig(
                source_id=f"career-page:{company_name.casefold().replace(' ', '-')}",
                name=company_name,
                kind="career-page",
                seed_urls=career_urls,
                job_link_selector="a[href*='jobs'], a[href*='careers'], a[href*='vacan']",
                company_name_override=company_name,
            )
        )


def default_sources(extra_career_pages: dict[str, tuple[str, ...]] | None = None) -> list[BaseSource]:
    sources: list[BaseSource] = [HelloJobAzSource(), BossAzSource()]

    for company_name, career_urls in (extra_career_pages or {}).items():
        sources.append(CareerPageSource(company_name, career_urls))

    return sources
