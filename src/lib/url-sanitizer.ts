/**
 * Centralized URL sanitization for the job ingestion pipeline.
 *
 * Every candidate URL must pass through sanitizeJobUrl() before it is stored
 * in any URL column (source_listing_url, job_detail_url, apply_action_url,
 * external_apply_url, resolved_apply_url, canonical_apply_url).
 *
 * Rules enforced:
 *  - Must be a non-empty string after trimming
 *  - Must parse as an absolute URL with http: or https: protocol
 *  - Must not be a placeholder (#, javascript:*, mailto:*, tel:*)
 *  - Must not be a bare generic homepage/listing page
 *  - Tracking params are stripped for canonical storage
 */

const PLACEHOLDER_PATTERNS = [
  /^#$/,
  /^\/$/,
  /^javascript:/i,
  /^mailto:/i,
  /^tel:/i,
  /^data:/i,
  /^about:blank$/i,
  /^void\(0\)$/i,
];

const TRACKING_PARAM_NAMES = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "refid",
  "trackingid",
  "trk",
  "source",
  "campaign",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

/**
 * Paths that indicate a generic landing page with no specific job content.
 * Used to prevent storing listing/homepage URLs as if they represent a
 * specific job vacancy.
 */
const GENERIC_LANDING_PATHS = new Set([
  "/",
  "/jobs",
  "/job",
  "/careers",
  "/career",
  "/vacancies",
  "/vacancy",
  "/en",
  "/az",
  "/ru",
  "/en/jobs",
  "/en/careers",
  "/en/vacancies",
  "/az/jobs",
  "/az/careers",
  "/ru/jobs",
  "/ru/careers",
  "/careers/jobs",
  "/about",
  "/contact",
  "/team",
]);

/**
 * Returns true if the raw string looks like a non-URL placeholder.
 */
export function isPlaceholderUrl(raw: string | null | undefined): boolean {
  const value = raw?.trim() ?? "";
  if (!value) {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Returns true if the URL points to a generic listing/homepage path that
 * does NOT represent a specific job posting.
 *
 * A URL that contains a numeric ID segment or a long slug after the base
 * path is considered "specific enough" and will return false.
 */
export function isGenericListingUrl(url: string | null | undefined): boolean {
  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    if (!GENERIC_LANDING_PATHS.has(pathname.toLowerCase())) {
      return false;
    }

    // Even if the path is generic, a query with a specific job ID signals
    // a job-board detail page (e.g. /vacancies?id=12345).
    const hasSpecificQuery =
      parsed.searchParams.has("id") ||
      parsed.searchParams.has("job_id") ||
      parsed.searchParams.has("vacancy_id") ||
      parsed.searchParams.has("vacancy") ||
      parsed.searchParams.has("slug");

    return !hasSpecificQuery;
  } catch {
    return true;
  }
}

/**
 * Attempts to resolve a relative URL against a base origin.
 * Returns null if resolution fails.
 */
function resolveRelativeUrl(
  candidate: string,
  baseUrl: string | null | undefined
): string | null {
  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Strip known tracking/analytics params from a URL for canonical storage.
 */
export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);

    for (const name of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAM_NAMES.has(name.toLowerCase())) {
        parsed.searchParams.delete(name);
      }
    }

    // Remove empty search string
    if (parsed.searchParams.toString() === "") {
      parsed.search = "";
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

export type SanitizeUrlOptions = {
  /** If provided, relative URLs are resolved against this origin. */
  baseUrl?: string | null;

  /**
   * If true, generic listing URLs are allowed as valid output.
   * Use this ONLY for source_listing_url (where we genuinely want the
   * search/listing page).  Never set true for job_detail_url,
   * apply_url, or canonical_apply_url.
   */
  allowGenericListing?: boolean;

  /**
   * If true, strip tracking params for canonical storage.
   * Default: true.
   */
  stripTracking?: boolean;
};

/**
 * The main entry point for all URL sanitization in the pipeline.
 *
 * Returns a clean, absolute, verified URL string — or null if the input
 * is invalid, placeholder, or an obviously wrong link.
 *
 * A null return means: "we do not have a verified URL for this field;
 * keep it unresolved instead of guessing."
 */
export function sanitizeJobUrl(
  raw: string | null | undefined,
  options?: SanitizeUrlOptions
): string | null {
  const value = raw?.trim() ?? "";

  if (!value) {
    return null;
  }

  // Reject obvious placeholders
  if (isPlaceholderUrl(value)) {
    return null;
  }

  // Try to parse as absolute URL
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    // Not an absolute URL — try resolving as relative
    const resolved = resolveRelativeUrl(value, options?.baseUrl);
    if (!resolved) {
      return null;
    }

    try {
      parsed = new URL(resolved);
    } catch {
      return null;
    }
  }

  // Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  // Hostname sanity
  if (!parsed.hostname || parsed.hostname === "localhost") {
    return null;
  }

  // Reject generic listing pages unless explicitly allowed
  if (!options?.allowGenericListing && isGenericListingUrl(parsed.toString())) {
    return null;
  }

  // Strip tracking params by default
  const shouldStrip = options?.stripTracking !== false;
  const cleaned = shouldStrip
    ? stripTrackingParams(parsed.toString())
    : parsed.toString();

  return cleaned;
}

/**
 * Validates an array of candidate URLs and returns only the valid ones.
 */
export function sanitizeJobUrlList(
  urls: string[] | null | undefined,
  options?: SanitizeUrlOptions
): string[] {
  if (!urls || !Array.isArray(urls)) {
    return [];
  }

  return urls
    .map((url) => sanitizeJobUrl(url, options))
    .filter((url): url is string => url !== null);
}

/**
 * Quick check: is this URL usable as a final verified redirect target?
 *
 * This is a stricter check used before building outbound hrefs and
 * publishing job records. In addition to the base sanitization, it
 * rejects generic listing pages unconditionally.
 */
export function isVerifiedRedirectTarget(
  url: string | null | undefined
): boolean {
  if (!url) {
    return false;
  }

  const cleaned = sanitizeJobUrl(url, { allowGenericListing: false });

  if (!cleaned) {
    return false;
  }

  // Additional: reject if it looks like it only has tracking params
  try {
    const parsed = new URL(cleaned);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    // Must have a non-trivial path
    if (pathname === "/" && !parsed.search) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
