export const jobModerationStatuses = [
  "draft",
  "suggested",
  "needs_review",
  "approved",
  "published",
  "rejected",
  "archived"
] as const;

export type JobModerationStatus = (typeof jobModerationStatuses)[number];

const visibleStatuses = new Set<JobModerationStatus>(["published"]);

export function isJobModerationStatus(value: unknown): value is JobModerationStatus {
  return typeof value === "string" && jobModerationStatuses.includes(value as JobModerationStatus);
}

export function normalizeJobModerationStatus(
  value: unknown,
  fallback: JobModerationStatus = "draft"
): JobModerationStatus {
  return isJobModerationStatus(value) ? value : fallback;
}

export function isPublicJobModerationStatus(status: JobModerationStatus | null | undefined) {
  return status ? visibleStatuses.has(status) : false;
}

export function isReviewQueueStatus(status: JobModerationStatus | null | undefined) {
  return status === "suggested" || status === "needs_review" || status === "draft";
}
