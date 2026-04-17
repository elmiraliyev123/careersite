import {
  extractDomain,
  isKnownAtsHost,
  normalizeComparableText,
  nowIsoTimestamp,
  type ApplyLinkValidationResult
} from "@/lib/job-intelligence";
import { sanitizeJobUrl, isPlaceholderUrl, isGenericListingUrl } from "@/lib/url-sanitizer";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOGIN_WALL_PATTERNS = [
  /\bsign in\b/i,
  /\blog in\b/i,
  /\bgiriş et\b/i,
  /\bjoin linkedin\b/i,
  /\bcontinue with google\b/i,
  /\bcontinue with linkedin\b/i,
  /\bauth required\b/i
];
const EXPIRED_PATTERNS = [
  /\b404\b/i,
  /\bnot found\b/i,
  /\bpage cannot be found\b/i,
  /\bjob (?:is )?no longer available\b/i,
  /\bposition (?:has been )?filled\b/i,
  /\bapplication(?:s)? closed\b/i,
  /\bjob expired\b/i,
  /\barchived\b/i,
  /\bsəhifə tapılmadı\b/i,
  /\bmüraciət müddəti bitib\b/i,
  /\bno longer accepting applications\b/i,
  /\bthis posting has expired\b/i,
  /\bvakansiya bağlanıb\b/i
];
const ACCESS_DENIED_PATTERNS = [
  /\baccess denied\b/i,
  /\bforbidden\b/i,
  /\b403\b/i,
  /\bcaptcha\b/i,
  /\bplease verify you are (a )?human\b/i,
  /\bbot detection\b/i
];
const APPLY_PATTERNS = [
  /\bapply now\b/i,
  /\bapply for this job\b/i,
  /\bsubmit application\b/i,
  /\bstart your application\b/i,
  /\bmüraciət et\b/i,
  /\bmüraciət\b/i,
  /\bquick apply\b/i
];

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitleTokens(title: string) {
  return Array.from(
    new Set(
      normalizeComparableText(title)
        .split(" ")
        .filter((token) => token.length >= 4)
        .slice(0, 8)
    )
  );
}

function isLikelyGenericLandingPage(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return [
    "/",
    "/jobs",
    "/careers",
    "/career",
    "/vacancies",
    "/vacancy",
    "/en",
    "/az",
    "/ru",
    "/en/jobs",
    "/en/careers",
    "/az/careers",
    "/az/jobs",
    "/ru/careers",
    "/ru/jobs",
    "/careers/jobs",
    "/about",
    "/contact",
    "/team",
    "/search",
    "/en/vacancies",
    "/az/vacancies"
  ].includes(pathname);
}

function hasJobSpecificPath(pathname: string) {
  return /\/(job|jobs|vacanc|vacancy|opening|openings|position)s?(\/|$)/i.test(pathname);
}

async function fetchWithRedirects(url: string, maxRedirects = 5) {
  const redirectChain = [url];
  let currentUrl = url;

  for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
    const response = await fetch(currentUrl, {
      headers: DEFAULT_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      cache: "no-store"
    });

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        return {
          response,
          finalUrl: currentUrl,
          redirectChain
        };
      }

      currentUrl = new URL(location, currentUrl).toString();
      redirectChain.push(currentUrl);
      continue;
    }

    return {
      response,
      finalUrl: currentUrl,
      redirectChain
    };
  }

  throw new Error("redirect_limit_exceeded");
}

export async function validateApplyLink(options: {
  candidateUrl: string | null | undefined;
  expectedCompanyDomain?: string | null;
  title?: string | null;
  allowLinkedInApplyDetail?: boolean;
  linkedInApplyType?: "linkedin_easy_apply" | "linkedin_offsite" | "linkedin_detail_only" | null;
}): Promise<ApplyLinkValidationResult> {
  const checkedAt = nowIsoTimestamp();
  const candidateUrl = options.candidateUrl?.trim() ?? "";

  if (!candidateUrl) {
    return {
      status: "broken",
      checkedAt,
      httpStatus: null,
      finalUrl: null,
      reason: "missing_apply_url",
      verifiedApply: false,
      redirectChain: [],
      flags: ["missing_url"]
    };
  }

  // Pre-validation: reject obviously invalid URLs before making HTTP requests
  if (isPlaceholderUrl(candidateUrl)) {
    return {
      status: "broken",
      checkedAt,
      httpStatus: null,
      finalUrl: null,
      reason: "placeholder_url",
      verifiedApply: false,
      redirectChain: [],
      flags: ["placeholder_url"]
    };
  }

  // Pre-validation: reject generic listing pages
  if (isGenericListingUrl(candidateUrl)) {
    return {
      status: "broken",
      checkedAt,
      httpStatus: null,
      finalUrl: null,
      reason: "generic_listing_page",
      verifiedApply: false,
      redirectChain: [],
      flags: ["generic_listing", "generic_path"]
    };
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    return {
      status: "broken",
      checkedAt,
      httpStatus: null,
      finalUrl: null,
      reason: "invalid_url",
      verifiedApply: false,
      redirectChain: [],
      flags: ["invalid_url"]
    };
  }

  try {
    const { response, finalUrl, redirectChain } = await fetchWithRedirects(parsedUrl.toString());
    const finalDomain = extractDomain(finalUrl);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const flags: string[] = [];

    if (response.status === 410) {
      return {
        status: "broken",
        checkedAt,
        httpStatus: 410,
        finalUrl,
        reason: "gone_410",
        verifiedApply: false,
        redirectChain,
        flags: ["gone"]
      };
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        status: "broken",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: `http_${response.status}`,
        verifiedApply: false,
        redirectChain,
        flags: ["http_error"]
      };
    }

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        status: "broken",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: "non_html_destination",
        verifiedApply: false,
        redirectChain,
        flags: ["non_html"]
      };
    }

    const html = await response.text();
    const plainText = stripHtml(html).slice(0, 12000);
    const normalizedText = normalizeComparableText(plainText);
    const finalParsedUrl = new URL(finalUrl);
    const titleTokens = extractTitleTokens(options.title ?? "");
    const matchingTitleTokens = titleTokens.filter((token) => normalizedText.includes(token));
    const hasApplySignal = APPLY_PATTERNS.some((pattern) => pattern.test(plainText));
    const isAtsHost = isKnownAtsHost(finalDomain);
    const isLinkedInDetail = Boolean(finalDomain?.endsWith("linkedin.com") && finalParsedUrl.pathname.includes("/jobs/view/"));
    const hasLinkedInApplySignal =
      /Join to apply for the/i.test(plainText) ||
      /job-details-topcard-apply-modal/i.test(html) ||
      /job-details-subnav-apply-modal/i.test(html);
    const hasLinkedInOffsiteSignal =
      /apply-link-offsite|offsite-apply-icon|Continue to apply/i.test(html);

    if (isLinkedInDetail && options.allowLinkedInApplyDetail && hasLinkedInApplySignal) {
      return {
        status: "valid",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason:
          options.linkedInApplyType === "linkedin_offsite" || hasLinkedInOffsiteSignal
            ? "linkedin_offsite_apply_detail"
            : "linkedin_easy_apply_detail",
        verifiedApply: false,
        redirectChain,
        flags: [
          "linkedin_detail_apply",
          ...(hasLinkedInOffsiteSignal ? ["linkedin_offsite"] : ["linkedin_easy_apply"]),
          ...(matchingTitleTokens.length > 0 ? [] : ["title_mismatch"])
        ]
      };
    }

    if (LOGIN_WALL_PATTERNS.some((pattern) => pattern.test(plainText))) {
      return {
        status: "broken",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: "login_wall",
        verifiedApply: false,
        redirectChain,
        flags: ["login_wall"]
      };
    }

    if (EXPIRED_PATTERNS.some((pattern) => pattern.test(plainText) || pattern.test(finalUrl))) {
      return {
        status: "broken",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: "expired_or_missing",
        verifiedApply: false,
        redirectChain,
        flags: ["expired"]
      };
    }

    // Detect interstitial/access-denied/CAPTCHA pages
    if (ACCESS_DENIED_PATTERNS.some((pattern) => pattern.test(plainText))) {
      flags.push("access_denied");
      return {
        status: "uncertain",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: "access_denied_or_captcha",
        verifiedApply: false,
        redirectChain,
        flags
      };
    }

    // Detect redirect to a completely different company's domain
    if (
      options.expectedCompanyDomain &&
      finalDomain &&
      finalDomain !== options.expectedCompanyDomain &&
      !finalDomain.endsWith(`.${options.expectedCompanyDomain}`) &&
      !isKnownAtsHost(finalDomain) &&
      !finalDomain.endsWith("linkedin.com")
    ) {
      flags.push("domain_mismatch");
    }

    if (isLikelyGenericLandingPage(finalParsedUrl) && !hasApplySignal) {
      flags.push("generic_path");
    }

    if (matchingTitleTokens.length === 0 && !isAtsHost) {
      flags.push("title_mismatch");
    }

    if (
      options.expectedCompanyDomain &&
      finalDomain &&
      finalDomain !== options.expectedCompanyDomain &&
      !finalDomain.endsWith(`.${options.expectedCompanyDomain}`) &&
      !isAtsHost
    ) {
      flags.push("domain_mismatch");
    }

    if (isAtsHost || (hasApplySignal && matchingTitleTokens.length > 0)) {
      return {
        status: "valid",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: isAtsHost ? "ats_job_page" : "job_page_with_apply_signal",
        verifiedApply: true,
        redirectChain,
        flags
      };
    }

    if (
      !isLikelyGenericLandingPage(finalParsedUrl) &&
      (
        matchingTitleTokens.length >= 2 ||
        (matchingTitleTokens.length >= 1 && hasJobSpecificPath(finalParsedUrl.pathname))
      )
    ) {
      return {
        status: "valid",
        checkedAt,
        httpStatus: response.status,
        finalUrl,
        reason: "verified_job_detail_page",
        verifiedApply: false,
        redirectChain,
        flags: [...flags, "job_detail_page"]
      };
    }

    return {
      status: "broken",
      checkedAt,
      httpStatus: response.status,
      finalUrl,
      reason: "generic_or_non_apply_page",
      verifiedApply: false,
      redirectChain,
      flags: flags.length > 0 ? flags : ["generic_page"]
    };
  } catch (error) {
    return {
      status: "broken",
      checkedAt,
      httpStatus: null,
      finalUrl: candidateUrl,
      reason: error instanceof Error ? error.message : "link_validation_failed",
      verifiedApply: false,
      redirectChain: [candidateUrl],
      flags: ["request_failed"]
    };
  }
}
