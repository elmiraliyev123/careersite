"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Company, Job } from "@/data/platform";
import { type JobModerationStatus } from "@/lib/moderation";
import { getPrimaryLocalizedText } from "@/lib/localized-content";

type AdminPanelClientProps = {
  companies: Company[];
  jobs: Job[];
};

type AdminMessage = {
  kind: "success" | "error";
  text: string;
} | null;

type DrawerState =
  | { type: "job"; mode: "create" | "edit"; slug?: string }
  | { type: "company"; mode: "create" | "edit"; slug?: string }
  | null;

type JobFormState = {
  title: string;
  companySlug: string;
  city: string;
  workModel: Job["workModel"];
  level: Job["level"];
  category: string;
  postedAt: string;
  deadline: string;
  summary: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  tags: string;
  applyUrl: string;
  sourceName: string;
  sourceUrl: string;
  moderationStatus: JobModerationStatus;
  moderationNotes: string;
};

type CompanyFormState = {
  name: string;
  tagline: string;
  sector: string;
  industryTags: string;
  size: string;
  location: string;
  website: string;
  companyDomain: string;
  logo: string;
  cover: string;
  about: string;
  focusAreas: string;
  youthOffer: string;
  benefits: string;
  verified: boolean;
  featured: boolean;
  wikipediaSummary: string;
  wikipediaSourceUrl: string;
};

const jobLevelOptions: Job["level"][] = ["Təcrübə", "Junior", "Trainee", "Yeni məzun", "Mid", "Senior", "Manager", "Naməlum"];
const workModelOptions: Job["workModel"][] = ["Ofisdən", "Hibrid", "Uzaqdan"];

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDeadlineValue() {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  return date.toISOString().slice(0, 10);
}

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

function createEmptyJobForm(companySlug = ""): JobFormState {
  return {
    title: "",
    companySlug,
    city: "Bakı",
    workModel: "Hibrid",
    level: "Təcrübə",
    category: "",
    postedAt: todayValue(),
    deadline: defaultDeadlineValue(),
    summary: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    tags: "",
    applyUrl: "",
    sourceName: "",
    sourceUrl: "",
    moderationStatus: "draft",
    moderationNotes: ""
  };
}

function createEmptyCompanyForm(): CompanyFormState {
  return {
    name: "",
    tagline: "",
    sector: "",
    industryTags: "",
    size: "",
    location: "Bakı, Azərbaycan",
    website: "",
    companyDomain: "",
    logo: "",
    cover: "",
    about: "",
    focusAreas: "",
    youthOffer: "",
    benefits: "",
    verified: true,
    featured: false,
    wikipediaSummary: "",
    wikipediaSourceUrl: ""
  };
}

function mapJobToForm(job: Job): JobFormState {
  return {
    title: getPrimaryLocalizedText(job.title),
    companySlug: job.companySlug,
    city: job.city,
    workModel: job.workModel,
    level: job.level,
    category: getPrimaryLocalizedText(job.category),
    postedAt: job.postedAt,
    deadline: job.deadline,
    summary: getPrimaryLocalizedText(job.summary),
    responsibilities: joinLines(job.responsibilities),
    requirements: joinLines(job.requirements),
    benefits: joinLines(job.benefits),
    tags: (job.tags ?? []).map((tag) => getPrimaryLocalizedText(tag)).join("\n"),
    applyUrl: job.applyActionUrl ?? job.finalVerifiedUrl ?? job.canonicalApplyUrl ?? job.applyUrl ?? "",
    sourceName: job.sourceName ?? "",
    sourceUrl: job.sourceUrl ?? job.sourceListingUrl ?? "",
    moderationStatus: job.moderationStatus ?? "draft",
    moderationNotes: job.moderationNotes ?? ""
  };
}

function mapCompanyToForm(company: Company): CompanyFormState {
  return {
    name: company.name,
    tagline: company.tagline,
    sector: company.sector,
    industryTags: joinLines(company.industryTags ?? [company.sector]),
    size: company.size,
    location: company.location,
    website: company.website,
    companyDomain: company.companyDomain ?? "",
    logo: company.logo ?? "",
    cover: company.cover ?? "",
    about: company.about,
    focusAreas: joinLines(company.focusAreas),
    youthOffer: joinLines(company.youthOffer),
    benefits: joinLines(company.benefits),
    verified: company.verified !== false,
    featured: Boolean(company.featured),
    wikipediaSummary: company.wikipediaSummary ?? "",
    wikipediaSourceUrl: company.wikipediaSourceUrl ?? ""
  };
}

function formatScore(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

export function AdminPanelClient({ companies: initialCompanies, jobs: initialJobs }: AdminPanelClientProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initialCompanies);
  const [jobs, setJobs] = useState(initialJobs);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [jobForm, setJobForm] = useState<JobFormState>(createEmptyJobForm(initialCompanies[0]?.slug ?? ""));
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(createEmptyCompanyForm());
  const [message, setMessage] = useState<AdminMessage>(null);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLogoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedLogoFile);
    setLogoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedLogoFile]);

  const reviewJobs = useMemo(
    () => jobs.filter((job) => ["draft", "suggested", "needs_review"].includes(job.moderationStatus ?? "draft")),
    [jobs]
  );

  const companyJobCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const job of jobs) {
      counts.set(job.companySlug, (counts.get(job.companySlug) ?? 0) + 1);
    }

    return counts;
  }, [jobs]);

  function closeDrawer() {
    setDrawer(null);
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null);
  }

  function openJobEditor(job?: Job) {
    setMessage(null);

    if (job) {
      setJobForm(mapJobToForm(job));
      setDrawer({ type: "job", mode: "edit", slug: job.slug });
      return;
    }

    setJobForm(createEmptyJobForm(companies[0]?.slug ?? ""));
    setDrawer({ type: "job", mode: "create" });
  }

  function openCompanyEditor(company?: Company) {
    setMessage(null);
    setSelectedLogoFile(null);

    if (company) {
      setCompanyForm(mapCompanyToForm(company));
      setDrawer({ type: "company", mode: "edit", slug: company.slug });
      return;
    }

    setCompanyForm(createEmptyCompanyForm());
    setDrawer({ type: "company", mode: "create" });
  }

  function updateJobInState(nextJob: Job) {
    setJobs((current) => {
      const existingIndex = current.findIndex((item) => item.slug === nextJob.slug);

      if (existingIndex === -1) {
        return [nextJob, ...current];
      }

      const clone = [...current];
      clone[existingIndex] = nextJob;
      return clone;
    });
  }

  function updateCompanyInState(nextCompany: Company) {
    setCompanies((current) => {
      const existingIndex = current.findIndex((item) => item.slug === nextCompany.slug);

      if (existingIndex === -1) {
        return [nextCompany, ...current];
      }

      const clone = [...current];
      clone[existingIndex] = nextCompany;
      return clone;
    });
  }

  async function submitJob(statusOverride?: JobModerationStatus) {
    setIsSavingJob(true);
    setMessage(null);

    const endpoint =
      drawer?.type === "job" && drawer.mode === "edit" && drawer.slug
        ? `/api/jobs/${drawer.slug}`
        : "/api/jobs";
    const method = drawer?.type === "job" && drawer.mode === "edit" ? "PUT" : "POST";
    const moderationStatus = statusOverride ?? jobForm.moderationStatus;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: jobForm.title,
          companySlug: jobForm.companySlug,
          city: jobForm.city,
          workModel: jobForm.workModel,
          level: jobForm.level,
          category: jobForm.category,
          postedAt: jobForm.postedAt,
          deadline: jobForm.deadline,
          summary: jobForm.summary,
          responsibilities: splitLines(jobForm.responsibilities),
          requirements: splitLines(jobForm.requirements),
          benefits: splitLines(jobForm.benefits),
          tags: splitLines(jobForm.tags),
          applyUrl: jobForm.applyUrl,
          sourceName: jobForm.sourceName,
          sourceUrl: jobForm.sourceUrl,
          moderationStatus,
          moderationNotes: jobForm.moderationNotes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Vakansiya yadda saxlanmadı.");
      }

      updateJobInState(result.item);
      setMessage({ kind: "success", text: result.message ?? "Vakansiya yeniləndi." });
      router.refresh();
      closeDrawer();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Vakansiya yadda saxlanmadı."
      });
    } finally {
      setIsSavingJob(false);
    }
  }

  async function uploadLogoIfNeeded() {
    if (!selectedLogoFile) {
      return companyForm.logo;
    }

    const body = new FormData();
    body.append("file", selectedLogoFile);

    const response = await fetch("/api/admin/uploads/logo", {
      method: "POST",
      body
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message ?? "Logo yüklənmədi.");
    }

    return result.url as string;
  }

  async function submitCompany() {
    setIsSavingCompany(true);
    setMessage(null);

    const endpoint =
      drawer?.type === "company" && drawer.mode === "edit" && drawer.slug
        ? `/api/companies/${drawer.slug}`
        : "/api/companies";
    const method = drawer?.type === "company" && drawer.mode === "edit" ? "PUT" : "POST";

    try {
      const logo = await uploadLogoIfNeeded();
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: companyForm.name,
          tagline: companyForm.tagline,
          sector: companyForm.sector,
          industryTags: splitLines(companyForm.industryTags),
          size: companyForm.size,
          location: companyForm.location,
          website: companyForm.website,
          companyDomain: companyForm.companyDomain,
          logo,
          cover: companyForm.cover,
          about: companyForm.about,
          focusAreas: splitLines(companyForm.focusAreas),
          youthOffer: splitLines(companyForm.youthOffer),
          benefits: splitLines(companyForm.benefits),
          verified: companyForm.verified,
          featured: companyForm.featured,
          wikipediaSummary: companyForm.wikipediaSummary,
          wikipediaSourceUrl: companyForm.wikipediaSourceUrl
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Şirkət yadda saxlanmadı.");
      }

      updateCompanyInState(result.item);
      setMessage({ kind: "success", text: result.message ?? "Şirkət yadda saxlanıldı." });
      router.refresh();
      closeDrawer();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Şirkət yadda saxlanmadı."
      });
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function updateJobStatus(job: Job, moderationStatus: JobModerationStatus) {
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/jobs/${job.slug}/moderation`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          moderationStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Status yenilənmədi.");
      }

      updateJobInState(result.item);
      setMessage({ kind: "success", text: result.message ?? "Status yeniləndi." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Status yenilənmədi."
      });
    }
  }

  async function toggleVerified(company: Company) {
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/companies/${company.slug}/verified`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          verified: company.verified === false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Verified status yenilənmədi.");
      }

      updateCompanyInState(result.item);
      setMessage({ kind: "success", text: result.message ?? "Verified status yeniləndi." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Verified status yenilənmədi."
      });
    }
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  function renderJobSignals(job: Job) {
    return (
      <div className="admin-signals">
        <span>Trust: {formatScore(job.trustScore)}</span>
        <span>Internship: {formatScore(job.internshipConfidence)}</span>
        <span>Location: {formatScore(job.locationConfidence)}</span>
        <span>Duplicate: {formatScore(job.duplicateRisk)}</span>
        <span>Logo: {formatScore(job.logoConfidence)}</span>
        <span>Apply: {job.applyLinkStatus ?? "unknown"}</span>
      </div>
    );
  }

  function renderJobActions(job: Job) {
    const status = job.moderationStatus ?? "draft";

    return (
      <div className="admin-row-actions">
        {["draft", "suggested", "needs_review"].includes(status) ? (
          <button type="button" className="admin-button admin-button--primary" onClick={() => void updateJobStatus(job, "approved")}>
            Approve
          </button>
        ) : null}

        {status === "approved" ? (
          <button type="button" className="admin-button admin-button--primary" onClick={() => void updateJobStatus(job, "published")}>
            Publish
          </button>
        ) : null}

        {status === "published" ? (
          <button type="button" className="admin-button" onClick={() => void updateJobStatus(job, "approved")}>
            Unpublish
          </button>
        ) : null}

        <button type="button" className="admin-button" onClick={() => openJobEditor(job)}>
          Edit
        </button>

        {status !== "rejected" ? (
          <button type="button" className="admin-button admin-button--danger" onClick={() => void updateJobStatus(job, "rejected")}>
            Reject
          </button>
        ) : null}

        {status !== "archived" ? (
          <button type="button" className="admin-button" onClick={() => void updateJobStatus(job, "archived")}>
            Archive
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="admin-console">
      <aside className="admin-console__sidebar">
        <div className="admin-console__brand">
          <strong>CareerApple Admin</strong>
          <span>Moderation console</span>
        </div>

        <nav className="admin-console__nav" aria-label="Admin navigation">
          <a href="#review-queue">Suggested jobs</a>
          <a href="#all-jobs">All jobs</a>
          <a href="#companies">Companies</a>
        </nav>

        <div className="admin-console__sidebar-actions">
          <button type="button" className="admin-button admin-button--primary" onClick={() => openJobEditor()}>
            New job
          </button>
          <button type="button" className="admin-button" onClick={() => openCompanyEditor()}>
            New company
          </button>
        </div>
      </aside>

      <div className="admin-console__main">
        <header className="admin-console__topbar">
          <div>
            <h1>Admin panel</h1>
            <p>Suggested jobs stay internal until approved and published by an admin.</p>
          </div>

          <div className="admin-console__topbar-actions">
            <div className="admin-summary">
              <strong>{reviewJobs.length}</strong>
              <span>needs review</span>
            </div>
            <div className="admin-summary">
              <strong>{jobs.filter((job) => job.moderationStatus === "published").length}</strong>
              <span>published</span>
            </div>
            <div className="admin-summary">
              <strong>{companies.length}</strong>
              <span>companies</span>
            </div>
            <button type="button" className="admin-button" onClick={() => void logout()}>
              Logout
            </button>
          </div>
        </header>

        {message ? (
          <div className={`admin-banner admin-banner--${message.kind}`}>
            {message.text}
          </div>
        ) : null}

        <section id="review-queue" className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2>Suggested jobs</h2>
              <p>Review source signals before anything reaches the public feed.</p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Apply</th>
                  <th>Signals</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">No jobs waiting for review.</td>
                  </tr>
                ) : (
                  reviewJobs.map((job) => {
                    const company = companies.find((item) => item.slug === job.companySlug);
                    return (
                      <tr key={job.slug}>
                        <td>
                          <strong>{getPrimaryLocalizedText(job.title)}</strong>
                          <div className="admin-muted">{job.moderationStatus ?? "draft"}</div>
                        </td>
                        <td>{company?.name ?? job.companySlug}</td>
                        <td>{job.city}</td>
                        <td>
                          {job.sourceUrl ? (
                            <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="admin-link">
                              {job.sourceName ?? "Source"}
                            </a>
                          ) : (
                            <span className="admin-muted">{job.sourceName ?? "Manual"}</span>
                          )}
                        </td>
                        <td>
                          {job.finalVerifiedUrl ?? job.canonicalApplyUrl ?? job.applyUrl ? (
                            <a
                              href={job.finalVerifiedUrl ?? job.canonicalApplyUrl ?? job.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-link"
                            >
                              {job.applyLinkStatus ?? "view"}
                            </a>
                          ) : (
                            <span className="admin-status admin-status--muted">missing</span>
                          )}
                        </td>
                        <td>{renderJobSignals(job)}</td>
                        <td>{renderJobActions(job)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="all-jobs" className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2>All jobs</h2>
              <p>Edit, publish, unpublish, reject, or archive jobs.</p>
            </div>
            <button type="button" className="admin-button admin-button--primary" onClick={() => openJobEditor()}>
              Add job
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Apply status</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const company = companies.find((item) => item.slug === job.companySlug);
                  return (
                    <tr key={job.slug}>
                      <td>
                        <strong>{getPrimaryLocalizedText(job.title)}</strong>
                        <div className="admin-muted">{job.city} · {job.workModel}</div>
                      </td>
                      <td>{company?.name ?? job.companySlug}</td>
                      <td>
                        <span className="admin-status">{job.moderationStatus ?? "draft"}</span>
                      </td>
                      <td>{job.applyLinkStatus ?? "unknown"}</td>
                      <td>{job.deadline}</td>
                      <td>{renderJobActions(job)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="companies" className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2>Companies</h2>
              <p>Edit company metadata, verified state, domain, and logo.</p>
            </div>
            <button type="button" className="admin-button admin-button--primary" onClick={() => openCompanyEditor()}>
              Add company
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Name</th>
                  <th>Verified</th>
                  <th>Domain</th>
                  <th>Jobs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.slug}>
                    <td>
                      <div className="admin-logo-cell">
                        {company.logo ? (
                          <img src={company.logo} alt={company.name} />
                        ) : (
                          <span>{company.name[0]}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{company.name}</strong>
                      <div className="admin-muted">{company.website.replace(/^https?:\/\//, "")}</div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-toggle${company.verified !== false ? " admin-toggle--active" : ""}`}
                        onClick={() => void toggleVerified(company)}
                      >
                        {company.verified !== false ? "Verified" : "Hidden"}
                      </button>
                    </td>
                    <td>{company.companyDomain ?? "—"}</td>
                    <td>{companyJobCounts.get(company.slug) ?? 0}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="admin-button" onClick={() => openCompanyEditor(company)}>
                          Edit
                        </button>
                        <button type="button" className="admin-button" onClick={() => openCompanyEditor(company)}>
                          Logo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {drawer ? (
        <div className="admin-drawer" role="dialog" aria-modal="true">
          <button type="button" className="admin-drawer__backdrop" onClick={closeDrawer} aria-label="Close editor" />
          <div className="admin-drawer__panel">
            <div className="admin-drawer__header">
              <div>
                <h2>{drawer.type === "job" ? (drawer.mode === "edit" ? "Edit job" : "New job") : drawer.mode === "edit" ? "Edit company" : "New company"}</h2>
                <p>{drawer.type === "job" ? "Update moderation-ready job data." : "Manage company metadata and logo."}</p>
              </div>
              <button type="button" className="admin-button" onClick={closeDrawer}>
                Close
              </button>
            </div>

            {drawer.type === "job" ? (
              <div className="admin-form">
                <div className="admin-form-grid">
                  <label className="admin-field">
                    <span>Title</span>
                    <input value={jobForm.title} onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Company</span>
                    <select value={jobForm.companySlug} onChange={(event) => setJobForm((current) => ({ ...current, companySlug: event.target.value }))}>
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.slug} value={company.slug}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Location</span>
                    <input value={jobForm.city} onChange={(event) => setJobForm((current) => ({ ...current, city: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Work mode</span>
                    <select value={jobForm.workModel} onChange={(event) => setJobForm((current) => ({ ...current, workModel: event.target.value as Job["workModel"] }))}>
                      {workModelOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Level</span>
                    <select value={jobForm.level} onChange={(event) => setJobForm((current) => ({ ...current, level: event.target.value as Job["level"] }))}>
                      {jobLevelOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Category</span>
                    <input value={jobForm.category} onChange={(event) => setJobForm((current) => ({ ...current, category: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Posted</span>
                    <input type="date" value={jobForm.postedAt} onChange={(event) => setJobForm((current) => ({ ...current, postedAt: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Deadline</span>
                    <input type="date" value={jobForm.deadline} onChange={(event) => setJobForm((current) => ({ ...current, deadline: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Description</span>
                    <textarea rows={4} value={jobForm.summary} onChange={(event) => setJobForm((current) => ({ ...current, summary: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Tags</span>
                    <textarea rows={3} value={jobForm.tags} onChange={(event) => setJobForm((current) => ({ ...current, tags: event.target.value }))} placeholder={"Internship\nProduct"} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Responsibilities</span>
                    <textarea rows={4} value={jobForm.responsibilities} onChange={(event) => setJobForm((current) => ({ ...current, responsibilities: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Requirements</span>
                    <textarea rows={4} value={jobForm.requirements} onChange={(event) => setJobForm((current) => ({ ...current, requirements: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Benefits</span>
                    <textarea rows={3} value={jobForm.benefits} onChange={(event) => setJobForm((current) => ({ ...current, benefits: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Apply link</span>
                    <input value={jobForm.applyUrl} onChange={(event) => setJobForm((current) => ({ ...current, applyUrl: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Source name</span>
                    <input value={jobForm.sourceName} onChange={(event) => setJobForm((current) => ({ ...current, sourceName: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Source link</span>
                    <input value={jobForm.sourceUrl} onChange={(event) => setJobForm((current) => ({ ...current, sourceUrl: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Moderation notes</span>
                    <textarea rows={3} value={jobForm.moderationNotes} onChange={(event) => setJobForm((current) => ({ ...current, moderationNotes: event.target.value }))} />
                  </label>
                </div>

                <div className="admin-preview-links">
                  {jobForm.sourceUrl ? (
                    <a href={jobForm.sourceUrl} target="_blank" rel="noopener noreferrer" className="admin-link">
                      Preview source
                    </a>
                  ) : null}
                  {jobForm.applyUrl ? (
                    <a href={jobForm.applyUrl} target="_blank" rel="noopener noreferrer" className="admin-link">
                      Preview apply link
                    </a>
                  ) : null}
                </div>

                <div className="admin-drawer__actions">
                  <button type="button" className="admin-button" onClick={() => void submitJob()} disabled={isSavingJob}>
                    Save
                  </button>
                  <button type="button" className="admin-button admin-button--primary" onClick={() => void submitJob("published")} disabled={isSavingJob}>
                    Publish
                  </button>
                  <button type="button" className="admin-button admin-button--danger" onClick={() => void submitJob("rejected")} disabled={isSavingJob}>
                    Reject
                  </button>
                  <button type="button" className="admin-button" onClick={() => void submitJob("archived")} disabled={isSavingJob}>
                    Archive
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-form">
                <div className="admin-form-grid">
                  <label className="admin-field">
                    <span>Name</span>
                    <input value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Tagline</span>
                    <input value={companyForm.tagline} onChange={(event) => setCompanyForm((current) => ({ ...current, tagline: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Sector</span>
                    <input value={companyForm.sector} onChange={(event) => setCompanyForm((current) => ({ ...current, sector: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Domain</span>
                    <input value={companyForm.companyDomain} onChange={(event) => setCompanyForm((current) => ({ ...current, companyDomain: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Website</span>
                    <input value={companyForm.website} onChange={(event) => setCompanyForm((current) => ({ ...current, website: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Cover image URL</span>
                    <input value={companyForm.cover} onChange={(event) => setCompanyForm((current) => ({ ...current, cover: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Company size</span>
                    <input value={companyForm.size} onChange={(event) => setCompanyForm((current) => ({ ...current, size: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Location</span>
                    <input value={companyForm.location} onChange={(event) => setCompanyForm((current) => ({ ...current, location: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>About</span>
                    <textarea rows={4} value={companyForm.about} onChange={(event) => setCompanyForm((current) => ({ ...current, about: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Industry tags</span>
                    <textarea rows={3} value={companyForm.industryTags} onChange={(event) => setCompanyForm((current) => ({ ...current, industryTags: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Focus areas</span>
                    <textarea rows={3} value={companyForm.focusAreas} onChange={(event) => setCompanyForm((current) => ({ ...current, focusAreas: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Youth offer</span>
                    <textarea rows={3} value={companyForm.youthOffer} onChange={(event) => setCompanyForm((current) => ({ ...current, youthOffer: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Benefits</span>
                    <textarea rows={3} value={companyForm.benefits} onChange={(event) => setCompanyForm((current) => ({ ...current, benefits: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Wikipedia summary</span>
                    <textarea rows={3} value={companyForm.wikipediaSummary} onChange={(event) => setCompanyForm((current) => ({ ...current, wikipediaSummary: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>Wikipedia source URL</span>
                    <input value={companyForm.wikipediaSourceUrl} onChange={(event) => setCompanyForm((current) => ({ ...current, wikipediaSourceUrl: event.target.value }))} />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span>Logo URL override</span>
                    <input value={companyForm.logo} onChange={(event) => setCompanyForm((current) => ({ ...current, logo: event.target.value }))} placeholder="/uploads/company-logos/..." />
                  </label>
                </div>

                <div className="admin-upload">
                  <div className="admin-upload__preview">
                    {logoPreviewUrl || companyForm.logo ? (
                      <img src={logoPreviewUrl ?? companyForm.logo} alt={companyForm.name || "Logo preview"} />
                    ) : (
                      <span>No logo</span>
                    )}
                  </div>

                  <div className="admin-upload__controls">
                    <label className="admin-button">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedLogoFile(file);
                        }}
                        hidden
                      />
                      Upload logo
                    </label>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => {
                        setSelectedLogoFile(null);
                        setCompanyForm((current) => ({ ...current, logo: "" }));
                      }}
                    >
                      Remove logo
                    </button>
                  </div>
                </div>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={companyForm.verified}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, verified: event.target.checked }))}
                  />
                  <span>Verified company</span>
                </label>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={companyForm.featured}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, featured: event.target.checked }))}
                  />
                  <span>Featured on public site</span>
                </label>

                <div className="admin-drawer__actions">
                  <button type="button" className="admin-button admin-button--primary" onClick={() => void submitCompany()} disabled={isSavingCompany}>
                    Save company
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
