from __future__ import annotations

from collections.abc import Iterable
from urllib.parse import urlparse

import wikipediaapi

WIKIPEDIA_USER_AGENT = "CareerAppleIngestion/1.0 (ops@careerapple.local)"

KNOWN_COMPANY_DOMAINS = {
    "figma": "figma.com",
    "notion": "notion.so",
    "revolut": "revolut.com",
    "wise": "wise.com",
    "kapital bank": "kapitalbank.az",
    "boss az": "boss.az",
    "hellojob az": "hellojob.az",
}


def normalize_company_key(name: str) -> str:
    return " ".join(name.casefold().replace("-", " ").split())


def extract_domain(value: str | None) -> str | None:
    if not value:
        return None

    parsed = urlparse(value if "://" in value else f"https://{value}")
    hostname = parsed.hostname or ""
    hostname = hostname.removeprefix("www.")
    return hostname or None


def resolve_official_domain(
    company_name: str,
    website_hint: str | None = None,
    candidate_urls: Iterable[str] | None = None,
    known_domains: dict[str, str] | None = None,
) -> str | None:
    registry = known_domains or KNOWN_COMPANY_DOMAINS
    normalized_name = normalize_company_key(company_name)

    if website_hint:
        hinted_domain = extract_domain(website_hint)
        if hinted_domain:
            return hinted_domain

    if normalized_name in registry:
        return registry[normalized_name]

    for value in candidate_urls or ():
        domain = extract_domain(value)
        if not domain:
            continue

        root = domain.split(".")[0].replace("-", " ").casefold()
        if root and (root in normalized_name or normalized_name in root):
            return domain

    return None


def build_clearbit_logo_url(domain: str | None) -> str | None:
    if not domain:
        return None

    return f"https://logo.clearbit.com/{domain}"


def first_two_sentences(text: str) -> str:
    fragments = [fragment.strip() for fragment in text.replace("\n", " ").split(".") if fragment.strip()]
    return ". ".join(fragments[:2]) + ("." if fragments else "")


def fetch_wikipedia_summary(company_name: str, language: str = "en") -> dict[str, str] | None:
    try:
        wiki = wikipediaapi.Wikipedia(language=language, user_agent=WIKIPEDIA_USER_AGENT)
        page = wiki.page(company_name)
        if not page.exists():
            return None

        summary = first_two_sentences(page.summary)
    except Exception:
        return None

    if not summary:
        return None

    return {
        "summary": summary,
        "source_url": page.fullurl,
    }
