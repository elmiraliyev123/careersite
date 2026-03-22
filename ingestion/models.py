from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(slots=True)
class JobPosting:
    source_id: str
    source_kind: str
    source_url: str
    company_name: str
    title: str
    location_text: str | None = None
    description_text: str = ""
    posted_at: str | None = None
    employment_type: str | None = None
    company_site_hint: str | None = None
    scraped_at: str = field(default_factory=utc_now_iso)
    payload: dict[str, Any] = field(default_factory=dict)

    def to_record(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class CompanyEnrichment:
    canonical_name: str
    official_domain: str | None = None
    official_website_url: str | None = None
    clearbit_logo_url: str | None = None
    wikipedia_summary: str | None = None
    wikipedia_source_url: str | None = None
    categorization_prompt: dict[str, Any] | None = None
    updated_at: str = field(default_factory=utc_now_iso)

    def to_record(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class RunResult:
    started_at: str
    finished_at: str
    jobs: list[JobPosting]
    companies: list[CompanyEnrichment]
    errors: list[str]

    def to_record(self) -> dict[str, Any]:
        return {
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "job_count": len(self.jobs),
            "company_count": len(self.companies),
            "errors": list(self.errors),
        }
