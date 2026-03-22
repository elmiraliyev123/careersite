"use client";

import type { RefObject } from "react";
import { BookmarkPlus, Pin } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import type { Company, Job } from "@/data/platform";
import { useCandidateActivity } from "@/hooks/useCandidateActivity";
import { getLocalizedText } from "@/lib/localized-content";

type SaveJobButtonProps = {
  job: Job;
  company?: Company | null;
  flyFromRef?: RefObject<HTMLElement | null>;
};

function animateToDock(sourceRef: RefObject<HTMLElement | null> | undefined, logo: string, alt: string) {
  const dockTarget = document.querySelector<HTMLElement>("[data-saved-dock-target='true']");
  const sourceElement = sourceRef?.current?.querySelector("img") ?? sourceRef?.current;

  if (!dockTarget || !sourceElement || !logo) {
    return;
  }

  const sourceRect = sourceElement.getBoundingClientRect();
  const targetRect = dockTarget.getBoundingClientRect();
  const ghost = document.createElement("img");

  ghost.src = logo;
  ghost.alt = alt;
  ghost.className = "dock-flyout";
  ghost.style.left = `${sourceRect.left}px`;
  ghost.style.top = `${sourceRect.top}px`;
  ghost.style.width = `${sourceRect.width}px`;
  ghost.style.height = `${sourceRect.height}px`;
  document.body.appendChild(ghost);

  requestAnimationFrame(() => {
    const deltaX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const deltaY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

    ghost.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.32)`;
    ghost.style.opacity = "0.18";
  });

  ghost.addEventListener(
    "transitionend",
    () => {
      ghost.remove();
    },
    { once: true }
  );
}

export function SaveJobButton({ job, company, flyFromRef }: SaveJobButtonProps) {
  const { isSaved, toggleSavedJob } = useCandidateActivity();
  const { locale, t } = useI18n();
  const saved = isSaved(job.slug);

  function handleToggle() {
    const wasSaved = isSaved(job.slug);

    toggleSavedJob({
      slug: job.slug,
      title: getLocalizedText(job.title, locale),
      companySlug: job.companySlug,
      companyName: company?.name ?? job.companySlug,
      companyLogo: company?.logo ?? "",
      sourceUrl: job.applyUrl ?? job.directCompanyUrl ?? job.sourceUrl
    });

    if (!wasSaved && company?.logo) {
      animateToDock(flyFromRef, company.logo, company.name);
    }
  }

  return (
    <button
      type="button"
      className={`pin-button ${saved ? "pin-button--active" : ""}`}
      onClick={handleToggle}
      aria-pressed={saved}
      aria-label={saved ? t("actions.removeSavedJob") : t("actions.saveJob")}
      title={saved ? t("actions.removeSavedJob") : t("actions.saveJob")}
    >
      {saved ? <Pin size={16} /> : <BookmarkPlus size={16} />}
    </button>
  );
}
