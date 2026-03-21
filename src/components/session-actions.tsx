"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import type { SessionRole } from "@/lib/session";

type SessionActionsProps = {
  role: SessionRole | null;
};

export function SessionActions({ role }: SessionActionsProps) {
  const router = useRouter();
  const { t } = useI18n();

  async function logout() {
    await fetch("/api/session", {
      method: "DELETE"
    });

    router.push("/");
    router.refresh();
  }

  if (role === "admin") {
    return (
      <button type="button" className="button button--ghost" onClick={logout}>
        {t("actions.logout")}
      </button>
    );
  }

  return null;
}
