import type { Metadata } from "next";

import { PlaybookPageClient } from "@/components/playbook-page-client";

export const metadata: Metadata = {
  title: "Career Playbook | Stradify",
  description:
    "Interview, CV, portfolio, and outreach frameworks for early-career candidates in a bento-style playbook."
};

export default function PlaybookPage() {
  return <PlaybookPageClient />;
}
