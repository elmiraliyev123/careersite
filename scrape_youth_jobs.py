#!/usr/bin/env python3
"""
Breadth-first Azerbaijani job scraper for public listing sources.

Dependencies:
    pip install selenium beautifulsoup4

Usage:
    python3 scrape_youth_jobs.py "https://www.hellojob.az/vakansiyalar"
    python3 scrape_youth_jobs.py "https://boss.az/search/vacancies?sort_by=date_desc"
    python3 scrape_youth_jobs.py "https://www.tapla.az/vakansiyalar" --filter-mode early-career

Output:
    Writes extracted jobs to youth_jobs.json

Notes:
    - This script uses Selenium + BeautifulSoup.
    - Default behavior is broad extraction across real vacancy listings.
    - Optional early-career filtering exists, but it is opt-in instead of hard-coded.
    - `boss.az` may suppress results for automated sessions. For that case, the script
      also tries to parse GraphQL response payloads from Chrome DevTools logs.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


OUTPUT_FILE = Path("youth_jobs.json")
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)
KEYWORD_PATTERNS = (
    re.compile(r"təcrübəçi", re.IGNORECASE),
    re.compile(r"staj", re.IGNORECASE),
    re.compile(r"\bintern(?:ship)?\b", re.IGNORECASE),
    re.compile(r"\bjunior\b", re.IGNORECASE),
    re.compile(r"\btrainee\b", re.IGNORECASE),
    re.compile(r"yeni\s+məzun", re.IGNORECASE),
    re.compile(r"\basistent\b", re.IGNORECASE),
)


SITE_CONFIGS: dict[str, dict[str, Any]] = {
    "www.hellojob.az": {
        "wait_selectors": [
            "a.vacancies__body.h-100",
            ".vacancies__item",
        ],
        "card_selectors": [
            "a.vacancies__body.h-100",
        ],
        "title_selectors": [
            ".vacancies__title",
            "h2",
        ],
        "company_selectors": [
            ".vacancies__company",
        ],
        "location_selectors": [
            ".vacancies__location",
            "[class*='location']",
            "[class*='region']",
            "[class*='city']",
        ],
        "date_selectors": [
            ".vacancies__info li:last-child",
            ".vacancies__info__item:last-child",
        ],
        "no_results_selectors": [
            ".pagination",
            ".vacancies__item",
        ],
    },
    "hellojob.az": {
        "wait_selectors": [
            "a.vacancies__body.h-100",
            ".vacancies__item",
        ],
        "card_selectors": [
            "a.vacancies__body.h-100",
        ],
        "title_selectors": [
            ".vacancies__title",
            "h2",
        ],
        "company_selectors": [
            ".vacancies__company",
        ],
        "location_selectors": [
            ".vacancies__location",
            "[class*='location']",
            "[class*='region']",
            "[class*='city']",
        ],
        "date_selectors": [
            ".vacancies__info li:last-child",
            ".vacancies__info__item:last-child",
        ],
        "no_results_selectors": [
            ".pagination",
            ".vacancies__item",
        ],
    },
    "boss.az": {
        "wait_selectors": [
            "main a[href*='/vacancies/']",
            "[class*='AdsList'] a[href*='/vacancies/']",
        ],
        "card_selectors": [
            "main a[href*='/vacancies/']",
            "[class*='AdsList'] a[href*='/vacancies/']",
        ],
        "title_selectors": [
            "h2",
            "h3",
            "[class*='Title']",
        ],
        "company_selectors": [
            "[class*='Company']",
            "[class*='Subtitle']",
            "[class*='Owner']",
        ],
        "location_selectors": [
            "[class*='Location']",
            "[class*='Region']",
            "[class*='City']",
        ],
        "date_selectors": [
            "time",
            "[class*='Date']",
            "[class*='date']",
        ],
        "no_results_selectors": [
            "[class*='ResultTitle']",
        ],
        "use_graphql_fallback": True,
    },
    "www.boss.az": {
        "wait_selectors": [
            "main a[href*='/vacancies/']",
            "[class*='AdsList'] a[href*='/vacancies/']",
        ],
        "card_selectors": [
            "main a[href*='/vacancies/']",
            "[class*='AdsList'] a[href*='/vacancies/']",
        ],
        "title_selectors": [
            "h2",
            "h3",
            "[class*='Title']",
        ],
        "company_selectors": [
            "[class*='Company']",
            "[class*='Subtitle']",
            "[class*='Owner']",
        ],
        "location_selectors": [
            "[class*='Location']",
            "[class*='Region']",
            "[class*='City']",
        ],
        "date_selectors": [
            "time",
            "[class*='Date']",
            "[class*='date']",
        ],
        "no_results_selectors": [
            "[class*='ResultTitle']",
        ],
        "use_graphql_fallback": True,
    },
    "position.az": {
        "wait_selectors": [
            "tbody.grid tr[data-city]",
            "a[href*='/vacancy/']",
        ],
        "card_selectors": [
            "tbody.grid tr[data-city]",
        ],
        "link_selectors": [
            "td[title] > a[href*='/vacancy/']",
            "a.vacancy-row[href*='/vacancy/']",
            "a[href*='/vacancy/']",
        ],
        "title_selectors": [
            "td[title] > a[href*='/vacancy/']",
            "td[title]",
        ],
        "company_selectors": [
            "a.vacancy-row p",
            ".vacancy-row p",
        ],
        "location_selectors": [],
        "date_selectors": [
            ".vacancy-duration a",
            "td.vacancy-duration",
        ],
        "no_results_selectors": [
            "tbody.grid tr[data-city]",
        ],
    },
    "www.position.az": {
        "wait_selectors": [
            "tbody.grid tr[data-city]",
            "a[href*='/vacancy/']",
        ],
        "card_selectors": [
            "tbody.grid tr[data-city]",
        ],
        "link_selectors": [
            "td[title] > a[href*='/vacancy/']",
            "a.vacancy-row[href*='/vacancy/']",
            "a[href*='/vacancy/']",
        ],
        "title_selectors": [
            "td[title] > a[href*='/vacancy/']",
            "td[title]",
        ],
        "company_selectors": [
            "a.vacancy-row p",
            ".vacancy-row p",
        ],
        "location_selectors": [],
        "date_selectors": [
            ".vacancy-duration a",
            "td.vacancy-duration",
        ],
        "no_results_selectors": [
            "tbody.grid tr[data-city]",
        ],
    },
    "jobsearch.az": {
        "wait_selectors": [
            ".list__item a[href*='/vacancies/']",
            ".list__item",
        ],
        "card_selectors": [
            ".list__item",
        ],
        "link_selectors": [
            "a[href*='/vacancies/']",
        ],
        "title_selectors": [
            "h3.list__item__title",
            ".list__item__title",
        ],
        "company_selectors": [
            ".list__item__logo img",
            ".stories__item img",
        ],
        "location_selectors": [],
        "date_selectors": [
            ".text-transform-none",
        ],
        "no_results_selectors": [
            ".list__item",
        ],
    },
    "www.jobsearch.az": {
        "wait_selectors": [
            ".list__item a[href*='/vacancies/']",
            ".list__item",
        ],
        "card_selectors": [
            ".list__item",
        ],
        "link_selectors": [
            "a[href*='/vacancies/']",
        ],
        "title_selectors": [
            "h3.list__item__title",
            ".list__item__title",
        ],
        "company_selectors": [
            ".list__item__logo img",
            ".stories__item img",
        ],
        "location_selectors": [],
        "date_selectors": [
            ".text-transform-none",
        ],
        "no_results_selectors": [
            ".list__item",
        ],
    },
    "banker.az": {
        "wait_selectors": [
            ".job-info a[href*='/jobs/']",
            ".list-data",
        ],
        "card_selectors": [
            ".list-data",
        ],
        "link_selectors": [
            ".job-info a[href*='/jobs/']",
            "a[href*='/jobs/']",
        ],
        "title_selectors": [
            ".job-title",
            ".job-info h4 a",
        ],
        "company_selectors": [],
        "location_selectors": [
            ".job-location",
        ],
        "date_selectors": [
            ".job-date",
        ],
        "no_results_selectors": [
            ".list-data",
        ],
    },
    "www.tapla.az": {
        "wait_selectors": [
            "script[type='application/ld+json']",
            "a[href*='/vakansiyalar/']",
        ],
        "card_selectors": [
            "a[href*='/vakansiyalar/']",
        ],
        "link_selectors": [
            "a[href*='/vakansiyalar/']",
        ],
        "title_selectors": [
            "h2",
            "h3",
        ],
        "company_selectors": [],
        "location_selectors": [],
        "date_selectors": [],
        "no_results_selectors": [
            "script[type='application/ld+json']",
        ],
    },
    "jobnet.az": {
        "wait_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
        "card_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
        "link_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
        "title_selectors": [
            "p.text-18-32-500",
            "p.lg\\:text-20-32-500",
        ],
        "company_selectors": [
            "p.text-16-24-600",
        ],
        "location_selectors": [
            "div.flex.items-center.justify-between.mt-6 div.divider.flex.items-center.ml-3 p",
        ],
        "date_selectors": [
            "div.flex.items-center.justify-between.mt-6 div.divider.flex.items-center p.text-14-16-500",
        ],
        "no_results_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
    },
    "www.jobnet.az": {
        "wait_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
        "card_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
        "link_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
        "title_selectors": [
            "p.text-18-32-500",
            "p.lg\\:text-20-32-500",
        ],
        "company_selectors": [
            "p.text-16-24-600",
        ],
        "location_selectors": [
            "div.flex.items-center.justify-between.mt-6 div.divider.flex.items-center.ml-3 p",
        ],
        "date_selectors": [
            "div.flex.items-center.justify-between.mt-6 div.divider.flex.items-center p.text-14-16-500",
        ],
        "no_results_selectors": [
            "a[href*='/en/vacancies/']",
            "a[href*='/vacancies/']",
        ],
    },
    "smartjob.az": {
        "wait_selectors": [
            ".brows-job-list",
            "a[href*='/vacancy/']",
        ],
        "card_selectors": [
            ".brows-job-list",
        ],
        "link_selectors": [
            ".brows-job-position h3 a[href*='/vacancy/']",
            "a[href*='/vacancy/']",
        ],
        "title_selectors": [
            ".brows-job-position h3 a",
        ],
        "company_selectors": [
            ".company-title a",
        ],
        "location_selectors": [
            ".location-pin",
        ],
        "date_selectors": [],
        "no_results_selectors": [
            ".brows-job-list",
        ],
    },
    "www.smartjob.az": {
        "wait_selectors": [
            ".brows-job-list",
            "a[href*='/vacancy/']",
        ],
        "card_selectors": [
            ".brows-job-list",
        ],
        "link_selectors": [
            ".brows-job-position h3 a[href*='/vacancy/']",
            "a[href*='/vacancy/']",
        ],
        "title_selectors": [
            ".brows-job-position h3 a",
        ],
        "company_selectors": [
            ".company-title a",
        ],
        "location_selectors": [
            ".location-pin",
        ],
        "date_selectors": [],
        "no_results_selectors": [
            ".brows-job-list",
        ],
    },
    "jobsite.az": {
        "wait_selectors": [
            "a[href*='/vakansiya-is-elani/']",
            ".JobCard-module__21BaFa__jobCard",
        ],
        "card_selectors": [
            "a[href*='/vakansiya-is-elani/']",
        ],
        "link_selectors": [
            "a[href*='/vakansiya-is-elani/']",
        ],
        "title_selectors": [
            "p[title]",
        ],
        "company_selectors": [
            "p[data-size='xs']",
        ],
        "location_selectors": [
            "svg.tabler-icon-map-pin + p",
        ],
        "date_selectors": [
            "svg.tabler-icon-clock + p",
        ],
        "no_results_selectors": [
            "a[href*='/vakansiya-is-elani/']",
        ],
    },
    "www.jobsite.az": {
        "wait_selectors": [
            "a[href*='/vakansiya-is-elani/']",
            ".JobCard-module__21BaFa__jobCard",
        ],
        "card_selectors": [
            "a[href*='/vakansiya-is-elani/']",
        ],
        "link_selectors": [
            "a[href*='/vakansiya-is-elani/']",
        ],
        "title_selectors": [
            "p[title]",
        ],
        "company_selectors": [
            "p[data-size='xs']",
        ],
        "location_selectors": [
            "svg.tabler-icon-map-pin + p",
        ],
        "date_selectors": [
            "svg.tabler-icon-clock + p",
        ],
        "no_results_selectors": [
            "a[href*='/vakansiya-is-elani/']",
        ],
    },
    "www.linkedin.com": {
        "wait_selectors": [
            ".base-search-card",
            "a.base-card__full-link",
        ],
        "card_selectors": [
            ".base-search-card",
        ],
        "link_selectors": [
            "a.base-card__full-link",
        ],
        "title_selectors": [
            ".base-search-card__title",
        ],
        "company_selectors": [
            ".base-search-card__subtitle",
        ],
        "location_selectors": [
            ".job-search-card__location",
        ],
        "date_selectors": [
            ".job-search-card__listdate",
            "time",
        ],
        "no_results_selectors": [
            ".base-search-card",
            ".jobs-search__results-list",
        ],
    },
    "linkedin.com": {
        "wait_selectors": [
            ".base-search-card",
            "a.base-card__full-link",
        ],
        "card_selectors": [
            ".base-search-card",
        ],
        "link_selectors": [
            "a.base-card__full-link",
        ],
        "title_selectors": [
            ".base-search-card__title",
        ],
        "company_selectors": [
            ".base-search-card__subtitle",
        ],
        "location_selectors": [
            ".job-search-card__location",
        ],
        "date_selectors": [
            ".job-search-card__listdate",
            "time",
        ],
        "no_results_selectors": [
            ".base-search-card",
            ".jobs-search__results-list",
        ],
    },
}


def normalize_space(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip()
    return cleaned or None


def extract_node_value(node: Any) -> str | None:
    text = normalize_space(node.get_text(" ", strip=True)) if hasattr(node, "get_text") else None
    if text:
        return text

    for attr in ("content", "alt", "title", "aria-label", "value", "data-title"):
        try:
            attr_value = normalize_space(node.get(attr))
        except Exception:
            attr_value = None
        if attr_value:
            return attr_value

    return None


def canonicalize_job_detail_url(url: str) -> str:
    try:
        parsed = urlparse(url)
    except Exception:
        return url

    hostname = parsed.netloc.lower()
    if "linkedin.com" not in hostname:
        return url

    stripped_path = parsed.path.rstrip("/") or parsed.path
    return f"{parsed.scheme}://{parsed.netloc}{stripped_path}"


def title_matches_keywords(title: str | None) -> bool:
    if not title:
        return False
    return any(pattern.search(title) for pattern in KEYWORD_PATTERNS)


def should_keep_title(title: str | None, filter_mode: str) -> bool:
    if not title:
        return False
    return filter_mode != "early-career" or title_matches_keywords(title)


def split_title_and_company(title: str | None, company: str | None) -> tuple[str | None, str | None]:
    normalized_title = normalize_space(title)
    normalized_company = normalize_space(company)

    if not normalized_title:
        return None, normalized_company

    if normalized_company:
        return normalized_title, normalized_company

    for separator in (" — ", " – ", " - "):
        if separator not in normalized_title:
            continue

        left, right = normalized_title.rsplit(separator, 1)
        left = normalize_space(left.strip(" \"'“”"))
        right = normalize_space(right.strip(" \"'“”"))

        if left and right and len(right) <= 120:
            return left, right

    return normalized_title, None


def get_site_config(url: str) -> dict[str, Any]:
    hostname = urlparse(url).netloc.lower()
    return SITE_CONFIGS.get(hostname, {
        "wait_selectors": ["a[href*='vakans']", "a[href*='vacanc']", "a[href*='/job']"],
        "card_selectors": ["a[href*='vakans']", "a[href*='vacanc']", "a[href*='/job']"],
        "link_selectors": ["a[href*='vakans']", "a[href*='vacanc']", "a[href*='/job']"],
        "title_selectors": ["h2", "h3", "[class*='title']", "[class*='Title']"],
        "company_selectors": ["[class*='company']", "[class*='Company']"],
        "location_selectors": ["[class*='location']", "[class*='Location']", "[class*='city']", "[class*='region']"],
        "date_selectors": ["time", "[class*='date']", "[class*='Date']", "[class*='deadline']"],
        "no_results_selectors": [],
    })


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1600,2200")
    options.add_argument(f"--user-agent={USER_AGENT}")
    options.add_argument("--lang=az-AZ")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})

    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});
                Object.defineProperty(navigator, 'languages', {get: () => ['az-AZ', 'az', 'en-US', 'en']});
                window.chrome = window.chrome || { runtime: {} };
            """
        },
    )
    return driver


def wait_for_render(driver: webdriver.Chrome, config: dict[str, Any], timeout: int) -> None:
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )

    def cards_or_marker_present(d: webdriver.Chrome) -> bool:
        for selector in config.get("wait_selectors", []):
            if d.find_elements(By.CSS_SELECTOR, selector):
                return True
        for selector in config.get("no_results_selectors", []):
            if d.find_elements(By.CSS_SELECTOR, selector):
                return True
        return False

    try:
        WebDriverWait(driver, timeout).until(cards_or_marker_present)
    except TimeoutException:
        pass

    driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.4);")
    time.sleep(1.5)
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(1.0)


def first_text(node: Any, selectors: list[str]) -> str | None:
    for selector in selectors:
        try:
            element = node.select_one(selector)
            if element:
                text = extract_node_value(element)
                if text:
                    return text
        except Exception:
            continue
    return None


def unique_cards(soup: BeautifulSoup, selectors: list[str]) -> list[Any]:
    seen: set[str] = set()
    cards: list[Any] = []
    for selector in selectors:
        for node in soup.select(selector):
            href = normalize_space(node.get("href"))
            if not href:
                for link in node.select("a[href]"):
                    candidate_href = normalize_space(link.get("href"))
                    if (
                        candidate_href
                        and candidate_href not in {"#", "/", ""}
                        and not candidate_href.startswith("javascript:")
                        and not candidate_href.startswith("mailto:")
                    ):
                        href = candidate_href
                        break
            href = href or f"node-{id(node)}"
            if href in seen:
                continue
            seen.add(href)
            cards.append(node)
    return cards


def get_card_href(card: Any, link_selectors: list[str]) -> str | None:
    direct_href = normalize_space(card.get("href"))
    if direct_href:
        return direct_href

    for selector in link_selectors:
        try:
            element = card.select_one(selector)
            if element:
                href = normalize_space(element.get("href"))
                if href:
                    return href
        except Exception:
            continue

    try:
        fallback = card.select_one("a[href]")
        if fallback:
            href = normalize_space(fallback.get("href"))
            if href:
                return href
    except Exception:
        pass

    return None


def extract_explicit_job_urls_from_jsonld(html: str, base_url: str) -> dict[str, list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    title_to_urls: dict[str, list[str]] = {}

    def walk(payload: Any) -> None:
        if isinstance(payload, dict):
            item_type = normalize_space(str(payload.get("@type") or payload.get("type") or ""))
            if item_type in {"ListItem", "JobPosting"}:
                name = normalize_space(str(payload.get("name") or payload.get("title") or ""))
                raw_url = normalize_space(str(payload.get("url") or payload.get("item") or ""))
                if name and raw_url:
                    absolute = urljoin(base_url, raw_url)
                    title_to_urls.setdefault(name, []).append(absolute)

            for value in payload.values():
                walk(value)
        elif isinstance(payload, list):
            for item in payload:
                walk(item)

    for node in soup.select("script[type='application/ld+json']"):
        try:
            payload = json.loads(node.get_text(strip=True))
        except Exception:
            continue
        walk(payload)

    return title_to_urls


def parse_tapla_jobs_from_html(html: str, base_url: str, filter_mode: str) -> list[dict[str, Any]]:
    if "premiumJobs" not in html:
        return []

    match = re.search(r'\\"premiumJobs\\":(\[.*?\]),\\"currentPage\\"', html, flags=re.S)
    if not match:
        return []

    try:
        jobs_payload = json.loads(match.group(1).replace('\\"', '"'))
    except Exception:
        return []

    explicit_urls = extract_explicit_job_urls_from_jsonld(html, base_url)
    jobs: list[dict[str, Any]] = []

    for item in jobs_payload:
        if not isinstance(item, dict):
            continue

        title = normalize_space(str(item.get("title") or ""))
        title, company = split_title_and_company(title, normalize_space(str(item.get("company") or "")))
        if not should_keep_title(title, filter_mode):
            continue

        explicit_matches = explicit_urls.get(title or "", [])
        detail_url = explicit_matches[0] if len(explicit_matches) == 1 else None
        if not detail_url:
            continue

        jobs.append({
            "job_title": title,
            "company_name": company,
            "job_url": detail_url,
            "source_listing_url": base_url,
            "job_detail_url": canonicalize_job_detail_url(detail_url),
            "location": normalize_space(str(item.get("location") or "")),
            "publication_or_deadline_date": normalize_space(str(item.get("created_at") or item.get("updated_at") or "")),
            "job_description": normalize_space(str(item.get("description") or "")),
        })

    return jobs


def parse_cards_from_dom(html: str, base_url: str, config: dict[str, Any], filter_mode: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    cards = unique_cards(soup, config.get("card_selectors", []))
    jobs: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for card in cards:
        try:
            href = get_card_href(card, config.get("link_selectors", []))
            if not href:
                continue

            # Reject placeholder URLs before processing
            if href in ("#", "/", "") or href.startswith("javascript:") or href.startswith("mailto:"):
                continue

            absolute_url = urljoin(base_url, href)
            job_detail_url = canonicalize_job_detail_url(absolute_url)
            if absolute_url in seen_urls:
                continue

            title = first_text(card, config.get("title_selectors", []))
            company = first_text(card, config.get("company_selectors", []))
            title, company = split_title_and_company(title, company)
            location = first_text(card, config.get("location_selectors", []))
            date_value = first_text(card, config.get("date_selectors", []))

            if not should_keep_title(title, filter_mode):
                continue

            jobs.append({
                "job_title": title,
                "company_name": company,
                "job_url": absolute_url,
                # source_listing_url = the SEARCH PAGE where we found cards
                "source_listing_url": base_url,
                # job_detail_url = the individual card's href (the actual vacancy page)
                "job_detail_url": job_detail_url,
                "location": location,
                "publication_or_deadline_date": date_value,
            })
            seen_urls.add(absolute_url)
        except Exception:
            continue

    return jobs


def iter_graphql_bodies(driver: webdriver.Chrome) -> list[str]:
    bodies: list[str] = []
    seen_request_ids: set[str] = set()

    try:
        performance_logs = driver.get_log("performance")
    except Exception:
        return bodies

    for entry in performance_logs:
        try:
            message = json.loads(entry["message"])["message"]
            if message.get("method") != "Network.responseReceived":
                continue

            params = message.get("params", {})
            request_id = params.get("requestId")
            response = params.get("response", {})
            response_url = response.get("url", "")

            if not request_id or request_id in seen_request_ids:
                continue
            if "graphql" not in response_url:
                continue

            seen_request_ids.add(request_id)
            response_body = driver.execute_cdp_cmd(
                "Network.getResponseBody",
                {"requestId": request_id},
            )
            body = response_body.get("body", "")
            if response_body.get("base64Encoded"):
                body = base64.b64decode(body).decode("utf-8", errors="ignore")
            if body:
                bodies.append(body)
        except Exception:
            continue

    return bodies


def maybe_text_from_value(value: Any) -> str | None:
    if isinstance(value, str):
        return normalize_space(value)
    if isinstance(value, dict):
        for nested_key in ("name", "title", "label", "fullName", "slug"):
            nested_value = maybe_text_from_value(value.get(nested_key))
            if nested_value:
                return nested_value
    return None


def detect_candidate_job(obj: dict[str, Any], base_url: str, filter_mode: str) -> dict[str, Any] | None:
    title_keys = ("title", "name", "vacancyTitle", "vacancyName", "position", "profession")
    company_keys = ("company", "companyName", "employer", "organization", "company_name")
    url_keys = ("url", "href", "path", "absoluteUrl", "shareUrl", "link")
    location_keys = ("location", "city", "region", "place")
    date_keys = ("publishedAt", "updatedAt", "createdAt", "date", "deadline", "expireAt", "expiresAt")

    title = next((maybe_text_from_value(obj.get(key)) for key in title_keys if maybe_text_from_value(obj.get(key))), None)
    company = next((maybe_text_from_value(obj.get(key)) for key in company_keys if maybe_text_from_value(obj.get(key))), None)
    title, company = split_title_and_company(title, company)
    raw_url = next((maybe_text_from_value(obj.get(key)) for key in url_keys if maybe_text_from_value(obj.get(key))), None)
    location = next((maybe_text_from_value(obj.get(key)) for key in location_keys if maybe_text_from_value(obj.get(key))), None)
    date_value = next((maybe_text_from_value(obj.get(key)) for key in date_keys if maybe_text_from_value(obj.get(key))), None)

    if not should_keep_title(title, filter_mode):
        return None

    absolute_url = None
    if raw_url and (raw_url.startswith("http://") or raw_url.startswith("https://") or raw_url.startswith("/")):
        candidate_url = urljoin(base_url, raw_url)
        if any(token in candidate_url for token in ("/vakans", "/vacanc", "/jobs", "/job")):
            absolute_url = candidate_url

    if not absolute_url:
        return None

    return {
        "job_title": title,
        "company_name": company,
        "job_url": absolute_url,
        # source_listing_url = the SEARCH PAGE (base_url)
        "source_listing_url": base_url,
        # job_detail_url = the specific vacancy page URL from the API
        "job_detail_url": canonicalize_job_detail_url(absolute_url),
        "location": location,
        "publication_or_deadline_date": date_value,
    }


def walk_json_for_jobs(payload: Any, base_url: str, jobs: list[dict[str, Any]], filter_mode: str) -> None:
    if isinstance(payload, dict):
        candidate = detect_candidate_job(payload, base_url, filter_mode)
        if candidate:
            jobs.append(candidate)
        for value in payload.values():
            walk_json_for_jobs(value, base_url, jobs, filter_mode)
    elif isinstance(payload, list):
        for item in payload:
            walk_json_for_jobs(item, base_url, jobs, filter_mode)


def parse_jobs_from_graphql(driver: webdriver.Chrome, base_url: str, filter_mode: str) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    seen: set[str] = set()

    for body in iter_graphql_bodies(driver):
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            continue

        walk_json_for_jobs(payload, base_url, jobs, filter_mode)

    deduped: list[dict[str, Any]] = []
    for job in jobs:
        job_url = job.get("job_url")
        if not job_url or job_url in seen:
            continue
        seen.add(job_url)
        deduped.append(job)
    return deduped


def save_jobs(jobs: list[dict[str, Any]], output_path: Path) -> None:
    output_path.write_text(
        json.dumps(jobs, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def scrape(url: str, timeout: int, filter_mode: str) -> list[dict[str, Any]]:
    config = get_site_config(url)
    driver = build_driver()

    try:
        driver.get(url)
        wait_for_render(driver, config, timeout)

        html = driver.page_source

        if "tapla.az" in urlparse(url).netloc.lower():
            tapla_jobs = parse_tapla_jobs_from_html(html, url, filter_mode)
            if tapla_jobs:
                return tapla_jobs

        dom_jobs = parse_cards_from_dom(html, url, config, filter_mode)
        if dom_jobs:
            return dom_jobs

        if config.get("use_graphql_fallback"):
            graphql_jobs = parse_jobs_from_graphql(driver, url, filter_mode)
            if graphql_jobs:
                return graphql_jobs

        return []
    finally:
        driver.quit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape real Azerbaijani job listings without inventing vacancy URLs."
    )
    parser.add_argument("url", help="Target listing/search URL to scrape")
    parser.add_argument(
        "--output",
        default=str(OUTPUT_FILE),
        help="Path to the output JSON file (default: youth_jobs.json)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=25,
        help="Wait timeout in seconds (default: 25)",
    )
    parser.add_argument(
        "--filter-mode",
        choices=("all", "early-career"),
        default="all",
        help="Optional title filter mode (default: all)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = Path(args.output)

    try:
        jobs = scrape(args.url, args.timeout, args.filter_mode)
        save_jobs(jobs, output_path)
    except WebDriverException as exc:
        print(f"[ERROR] Selenium/WebDriver failed: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"[ERROR] Unexpected failure: {exc}", file=sys.stderr)
        return 1

    print(f"[INFO] Saved {len(jobs)} extracted job(s) to {output_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
