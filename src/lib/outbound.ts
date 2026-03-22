type SearchParamValue = string | string[] | undefined;

type BuildOutboundHrefOptions = {
  targetUrl: string;
  companyName?: string;
  logoUrl?: string;
  sourcePath?: string;
  fallbackHref?: string;
};

export type ParsedOutboundState = {
  targetUrl: string | null;
  companyName: string;
  logoUrl: string | null;
  sourcePath: string | null;
  hostnameLabel: string | null;
};

function getStringValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function isSafeExternalUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getHostnameLabel(value: string) {
  if (!isSafeExternalUrl(value)) {
    return null;
  }

  return new URL(value).hostname.replace(/^www\./, "");
}

export function getClearbitLogoUrl(value: string) {
  const hostname = getHostnameLabel(value);
  return hostname ? `https://logo.clearbit.com/${hostname}` : null;
}

export function buildOutboundHref({
  targetUrl,
  companyName,
  logoUrl,
  sourcePath,
  fallbackHref = "/jobs"
}: BuildOutboundHrefOptions) {
  const normalizedTarget = targetUrl.trim();

  if (!normalizedTarget) {
    return fallbackHref;
  }

  if (!isSafeExternalUrl(normalizedTarget)) {
    return normalizedTarget.startsWith("/") ? normalizedTarget : fallbackHref;
  }

  const searchParams = new URLSearchParams({
    url: normalizedTarget,
    company: companyName?.trim() || getHostnameLabel(normalizedTarget) || "CareerApple"
  });

  if (logoUrl && isSafeExternalUrl(logoUrl)) {
    searchParams.set("logo", logoUrl);
  }

  if (sourcePath?.startsWith("/")) {
    searchParams.set("source", sourcePath);
  }

  return `/outbound?${searchParams.toString()}`;
}

export function parseOutboundSearchParams(params: Record<string, SearchParamValue>): ParsedOutboundState {
  const targetUrl = getStringValue(params.url)?.trim() ?? "";
  const safeTargetUrl = isSafeExternalUrl(targetUrl) ? targetUrl : null;
  const hostnameLabel = safeTargetUrl ? getHostnameLabel(safeTargetUrl) : null;
  const companyName =
    getStringValue(params.company)?.trim() || hostnameLabel || "CareerApple";
  const sourceValue = getStringValue(params.source)?.trim();
  const logoValue = getStringValue(params.logo)?.trim() ?? "";

  return {
    targetUrl: safeTargetUrl,
    companyName,
    logoUrl: isSafeExternalUrl(logoValue)
      ? logoValue
      : safeTargetUrl
        ? getClearbitLogoUrl(safeTargetUrl)
        : null,
    sourcePath: sourceValue?.startsWith("/") ? sourceValue : null,
    hostnameLabel
  };
}
