import type { Metadata } from "next";

import { OutboundPageClient } from "@/components/outbound-page-client";
import { parseOutboundSearchParams } from "@/lib/outbound";

type OutboundPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Secure Redirect | Stradify",
  robots: {
    index: false,
    follow: false
  }
};

export default async function OutboundPage({ searchParams }: OutboundPageProps) {
  const params = await searchParams;
  const outboundState = parseOutboundSearchParams(params);

  return <OutboundPageClient {...outboundState} />;
}
