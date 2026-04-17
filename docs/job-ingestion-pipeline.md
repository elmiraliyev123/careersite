# Job Ingestion Pipeline

This pipeline is built for an Azerbaijan-focused job platform and follows a fail-closed rule set:

- never invent vacancy URLs
- never construct job links from company domains or slugs
- never expose unresolved outbound URLs in public apply redirects
- missing verified URLs are acceptable

## Pipeline Stages

1. Source discovery and inventory
2. Record extraction per source adapter
3. Candidate URL collection
4. Candidate URL validation
5. Normalization into raw pipeline candidates
6. AI-assisted classification and non-job rejection
7. Duplicate grouping on canonical job identity
8. Publish gating

## Source Strategy

Priority order:

1. Official API / structured feeds
2. Official ATS feeds such as Greenhouse and Lever
3. Official company career pages
4. Local Azerbaijan job boards
5. Restricted sources only as secondary evidence or manual review

Restricted sources like LinkedIn and Glassdoor are kept in inventory for policy visibility, but disabled as primary ingestion sources.

## URL Validation Rules

Candidate URLs are validated independently from extraction:

- must be absolute `http` or `https`
- redirects are followed
- DNS failures, unreachable hosts, 404/410 responses, and login walls are rejected or left unresolved
- generic home/list/search pages are rejected unless the final page is clearly the single job page
- final destination must still strongly match both title and company

Only a verified final destination may become `final_verified_url`.

## Publish Gate

Public jobs must satisfy all of the following:

- classified as a real job
- not rejected as stale / expired / low-trust / non-job
- `validation_status = verified`
- verified outbound vacancy or apply URL exists

Otherwise the candidate remains unpublished and reviewable.

## Smoke Tests

Admin-only smoke tests are exposed through `POST /api/admin/pipeline-smoke` with these scenarios:

- `broken_link`
- `unresolved_url`
- `duplicate_pair`

These run as dry-run inspections and do not write publishable jobs into the database.
