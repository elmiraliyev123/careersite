"use client";

import { useMemo, useState } from "react";

type CompanyLogoImageProps = {
  name: string;
  website?: string;
  logo?: string;
  size?: number;
  className?: string;
  preferWebsiteLogo?: boolean;
};

function getClearbitLogoUrl(website?: string) {
  if (!website) {
    return null;
  }

  try {
    const hostname = new URL(website).hostname.replace(/^www\./, "");
    return hostname ? `https://logo.clearbit.com/${hostname}` : null;
  } catch {
    return null;
  }
}

export function CompanyLogoImage({
  name,
  website,
  logo,
  size = 40,
  className,
  preferWebsiteLogo = false
}: CompanyLogoImageProps) {
  const sources = useMemo(() => {
    const websiteLogo = getClearbitLogoUrl(website);
    const preferredSources = preferWebsiteLogo ? [websiteLogo, logo] : [logo, websiteLogo];
    const unique = preferredSources.filter(
      (candidate, index, values): candidate is string =>
        typeof candidate === "string" && candidate.length > 0 && values.indexOf(candidate) === index
    );

    return unique;
  }, [logo, preferWebsiteLogo, website]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  if (!source) {
    return (
      <span
        className={className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span className="company-logo-fallback">{name.charAt(0).toUpperCase()}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className={className}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((current) => current + 1);
        }
      }}
    />
  );
}
