import type { Metadata } from "next";

import { PlaybookPageClient } from "@/components/playbook-page-client";

export const metadata: Metadata = {
  title: "Karyera Məsləhətləri | CareerApple",
  description:
    "CV, interview, portfolio və outreach üçün CareerApple-ın bento-stil Career Playbook səhifəsi."
};

export default function CareerTipsPage() {
  return <PlaybookPageClient />;
}
