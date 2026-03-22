from __future__ import annotations

from collections.abc import Iterable

ALLOWED_COMPANY_CATEGORIES = (
    "Fintex",
    "FMCG",
    "SaaS",
    "EdTech",
    "HealthTech",
    "InsurTech",
    "Marketplace",
    "E-commerce",
    "Telecom",
    "Energy",
    "Logistics",
    "Consulting",
    "Media",
    "GovTech",
)


def build_company_categorization_prompt(
    company_name: str,
    description_text: str,
    allowed_tags: Iterable[str] = ALLOWED_COMPANY_CATEGORIES,
) -> dict[str, object]:
    tags = list(allowed_tags)
    allowed_tags_list = ", ".join(tags)

    return {
        "model": "gpt-4.1-mini",
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You categorize companies into one and only one predefined industry tag. "
                    "Do not invent new tags. Respond in strict JSON with keys: category, confidence, rationale."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Company: {company_name}\n"
                    f"Allowed tags: {allowed_tags_list}\n\n"
                    "Description:\n"
                    f"{description_text}\n\n"
                    "Rules:\n"
                    "- Pick exactly one tag from the allowed list.\n"
                    "- Confidence must be a float between 0 and 1.\n"
                    "- Rationale must be one short sentence grounded in the description.\n"
                    "- If evidence is weak, still choose the closest allowed tag and explain why.\n"
                ),
            },
        ],
    }
