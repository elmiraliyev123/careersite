import type { Metadata } from "next";

import { PlaybookPageClient } from "@/components/playbook-page-client";

export const metadata: Metadata = {
  title: "Karyera Məsləhətləri | Stradify",
  description:
    "CV, interview, portfolio və outreach üçün Stradify-ın bento-stil Career Playbook səhifəsi."
};

export default async function CareerTipsPage() {
  return <PlaybookPageClient />;
}
