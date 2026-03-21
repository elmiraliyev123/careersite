#!/usr/bin/env python3
"""
Youth-focused job scraper for Azerbaijani job aggregators.

Dependencies:
    pip install selenium beautifulsoup4

Usage:
    python3 scrape_youth_jobs.py "https://www.hellojob.az/vakansiyalar"
    python3 scrape_youth_jobs.py "https://boss.az/search/vacancies?sort_by=date_desc"

Output:
    Writes strictly filtered jobs to youth_jobs.json

Notes:
    - This script uses Selenium + BeautifulSoup as requested.
    - `hellojob.az` has stable server-rendered cards, so DOM parsing works well.
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
TARGET_KEYWORDS = (
    "Təcrübəçi",
    "Staj",
    "Intern",
    "Junior",
    "Trainee",
    "Yeni məzun",
    "Asistent",
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


def title_matches_keywords(title: str | None) -> bool:
    if not title:
        return False
    return any(pattern.search(title) for pattern in KEYWORD_PATTERNS)


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
                text = normalize_space(element.get_text(" ", strip=True))
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
                link = node.select_one("a[href]")
                href = normalize_space(link.get("href")) if link else None
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


def parse_cards_from_dom(html: str, base_url: str, config: dict[str, Any]) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    cards = unique_cards(soup, config.get("card_selectors", []))
    jobs: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for card in cards:
        try:
            href = get_card_href(card, config.get("link_selectors", []))
            if not href:
                continue

            absolute_url = urljoin(base_url, href)
            if absolute_url in seen_urls:
                continue

            title = first_text(card, config.get("title_selectors", []))
            company = first_text(card, config.get("company_selectors", []))
            location = first_text(card, config.get("location_selectors", []))
            date_value = first_text(card, config.get("date_selectors", []))

            if not title_matches_keywords(title):
                continue

            jobs.append({
                "job_title": title,
                "company_name": company,
                "job_url": absolute_url,
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


def detect_candidate_job(obj: dict[str, Any], base_url: str) -> dict[str, Any] | None:
    title_keys = ("title", "name", "vacancyTitle", "vacancyName", "position", "profession")
    company_keys = ("company", "companyName", "employer", "organization", "company_name")
    url_keys = ("url", "href", "path", "slug", "absoluteUrl", "shareUrl", "link")
    location_keys = ("location", "city", "region", "place")
    date_keys = ("publishedAt", "updatedAt", "createdAt", "date", "deadline", "expireAt", "expiresAt")

    title = next((maybe_text_from_value(obj.get(key)) for key in title_keys if maybe_text_from_value(obj.get(key))), None)
    company = next((maybe_text_from_value(obj.get(key)) for key in company_keys if maybe_text_from_value(obj.get(key))), None)
    raw_url = next((maybe_text_from_value(obj.get(key)) for key in url_keys if maybe_text_from_value(obj.get(key))), None)
    location = next((maybe_text_from_value(obj.get(key)) for key in location_keys if maybe_text_from_value(obj.get(key))), None)
    date_value = next((maybe_text_from_value(obj.get(key)) for key in date_keys if maybe_text_from_value(obj.get(key))), None)

    if not title or not title_matches_keywords(title):
        return None

    absolute_url = None
    if raw_url:
        candidate_url = urljoin(base_url, raw_url)
        if any(token in candidate_url for token in ("/vakans", "/vacanc", "/jobs", "/job")):
            absolute_url = candidate_url

    if not absolute_url:
        return None

    return {
        "job_title": title,
        "company_name": company,
        "job_url": absolute_url,
        "location": location,
        "publication_or_deadline_date": date_value,
    }


def walk_json_for_jobs(payload: Any, base_url: str, jobs: list[dict[str, Any]]) -> None:
    if isinstance(payload, dict):
        candidate = detect_candidate_job(payload, base_url)
        if candidate:
            jobs.append(candidate)
        for value in payload.values():
            walk_json_for_jobs(value, base_url, jobs)
    elif isinstance(payload, list):
        for item in payload:
            walk_json_for_jobs(item, base_url, jobs)


def parse_jobs_from_graphql(driver: webdriver.Chrome, base_url: str) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    seen: set[str] = set()

    for body in iter_graphql_bodies(driver):
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            continue

        walk_json_for_jobs(payload, base_url, jobs)

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


def scrape(url: str, timeout: int) -> list[dict[str, Any]]:
    config = get_site_config(url)
    driver = build_driver()

    try:
        driver.get(url)
        wait_for_render(driver, config, timeout)

        dom_jobs = parse_cards_from_dom(driver.page_source, url, config)
        if dom_jobs:
            return dom_jobs

        if config.get("use_graphql_fallback"):
            graphql_jobs = parse_jobs_from_graphql(driver, url)
            if graphql_jobs:
                return graphql_jobs

        return []
    finally:
        driver.quit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape youth-focused internship/junior jobs from Azerbaijani job sites."
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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = Path(args.output)

    try:
        jobs = scrape(args.url, args.timeout)
        save_jobs(jobs, output_path)
    except WebDriverException as exc:
        print(f"[ERROR] Selenium/WebDriver failed: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"[ERROR] Unexpected failure: {exc}", file=sys.stderr)
        return 1

    print(f"[INFO] Saved {len(jobs)} filtered job(s) to {output_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
