"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { VerifiedBadge } from "@/components/verified-badge";
import { jobLevels, workModels, type Company, type Job } from "@/data/platform";
import { getPrimaryLocalizedText, type LocalizedContentValue } from "@/lib/localized-content";

type AdminPanelClientProps = {
  companies: Company[];
  jobs: Job[];
  availableCities: string[];
};

type SubmissionState = {
  kind: "success" | "error";
  message: string;
} | null;

function splitTextarea(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTextarea(values: LocalizedContentValue[]) {
  return values.map((value) => getPrimaryLocalizedText(value)).join("\n");
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function deadlineValue() {
  const date = new Date();
  date.setDate(date.getDate() + 21);

  return date.toISOString().slice(0, 10);
}

export function AdminPanelClient({ companies, jobs, availableCities }: AdminPanelClientProps) {
  const router = useRouter();
  const [companyState, setCompanyState] = useState<SubmissionState>(null);
  const [jobState, setJobState] = useState<SubmissionState>(null);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [editingCompanySlug, setEditingCompanySlug] = useState<string | null>(null);
  const [editingJobSlug, setEditingJobSlug] = useState<string | null>(null);

  const editingCompany = editingCompanySlug
    ? companies.find((company) => company.slug === editingCompanySlug) ?? null
    : null;
  const editingJob = editingJobSlug
    ? jobs.find((job) => job.slug === editingJobSlug) ?? null
    : null;

  async function submitCompany(formData: FormData, form: HTMLFormElement) {
    setIsSubmittingCompany(true);
    setCompanyState(null);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      tagline: String(formData.get("tagline") ?? "").trim(),
      sector: String(formData.get("sector") ?? "").trim(),
      size: String(formData.get("size") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      logo: String(formData.get("logo") ?? "").trim(),
      cover: String(formData.get("cover") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
      about: String(formData.get("about") ?? "").trim(),
      focusAreas: splitTextarea(String(formData.get("focusAreas") ?? "")),
      youthOffer: splitTextarea(String(formData.get("youthOffer") ?? "")),
      benefits: splitTextarea(String(formData.get("benefits") ?? "")),
      featured: formData.get("featured") === "on",
      createdAt: editingCompany?.createdAt ?? todayValue()
    };

    const endpoint = editingCompany ? `/api/companies/${editingCompany.slug}` : "/api/companies";
    const method = editingCompany ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Şirkət profili yadda saxlanmadı.");
      }

      form.reset();
      setEditingCompanySlug(null);
      setCompanyState({ kind: "success", message: result.message });
      router.refresh();
    } catch (error) {
      setCompanyState({
        kind: "error",
        message: error instanceof Error ? error.message : "Şirkət profili yadda saxlanmadı."
      });
    } finally {
      setIsSubmittingCompany(false);
    }
  }

  async function submitJob(formData: FormData, form: HTMLFormElement) {
    setIsSubmittingJob(true);
    setJobState(null);

    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      companySlug: String(formData.get("companySlug") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      workModel: String(formData.get("workModel") ?? "").trim(),
      level: String(formData.get("level") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
      postedAt: String(formData.get("postedAt") ?? "").trim(),
      deadline: String(formData.get("deadline") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      responsibilities: splitTextarea(String(formData.get("responsibilities") ?? "")),
      requirements: splitTextarea(String(formData.get("requirements") ?? "")),
      benefits: splitTextarea(String(formData.get("benefits") ?? "")),
      tags: splitTextarea(String(formData.get("tags") ?? "")),
      createdAt: editingJob?.createdAt ?? todayValue()
    };

    const endpoint = editingJob ? `/api/jobs/${editingJob.slug}` : "/api/jobs";
    const method = editingJob ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Vakansiya yadda saxlanmadı.");
      }

      form.reset();
      setEditingJobSlug(null);
      setJobState({ kind: "success", message: result.message });
      router.refresh();
    } catch (error) {
      setJobState({
        kind: "error",
        message: error instanceof Error ? error.message : "Vakansiya yadda saxlanmadı."
      });
    } finally {
      setIsSubmittingJob(false);
    }
  }

  async function removeCompany(slug: string) {
    if (!window.confirm("Bu şirkəti silmək istəyirsən? Bağlı vakansiyalar da silinə bilər.")) {
      return;
    }

    setCompanyState(null);

    try {
      const response = await fetch(`/api/companies/${slug}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Şirkət silinmədi.");
      }

      if (editingCompanySlug === slug) {
        setEditingCompanySlug(null);
      }

      setCompanyState({ kind: "success", message: result.message });
      router.refresh();
    } catch (error) {
      setCompanyState({
        kind: "error",
        message: error instanceof Error ? error.message : "Şirkət silinmədi."
      });
    }
  }

  async function removeJob(slug: string) {
    if (!window.confirm("Bu vakansiyanı silmək istəyirsən?")) {
      return;
    }

    setJobState(null);

    try {
      const response = await fetch(`/api/jobs/${slug}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Vakansiya silinmədi.");
      }

      if (editingJobSlug === slug) {
        setEditingJobSlug(null);
      }

      setJobState({ kind: "success", message: result.message });
      router.refresh();
    } catch (error) {
      setJobState({
        kind: "error",
        message: error instanceof Error ? error.message : "Vakansiya silinmədi."
      });
    }
  }

  return (
    <div className="admin-management-grid">
      <section className="detail-panel admin-section">
        <div className="admin-panel-header">
          <div>
            <p className="eyebrow">Şirkət idarəsi</p>
            <h2>{editingCompany ? "Şirkət profilini redaktə et" : "Yeni şirkət profili yarat"}</h2>
          </div>
          {editingCompany ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setEditingCompanySlug(null);
                setCompanyState(null);
              }}
            >
              Ləğv et
            </button>
          ) : null}
        </div>

        <p>
          Featured seçilən şirkətlərin internship və junior rolları ana səhifədə avtomatik
          görünəcək. Redaktə zamanı slug sabit qalır, yalnız profil məlumatı yenilənir.
        </p>

        <form
          key={editingCompany?.slug ?? "company-create"}
          className="stack-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;

            startTransition(() => {
              void submitCompany(new FormData(form), form);
            });
          }}
        >
          <label className="field">
            <span>Şirkət adı</span>
            <input
              name="name"
              type="text"
              defaultValue={editingCompany?.name ?? ""}
              placeholder="Məsələn: Miro"
              required
            />
          </label>

          <label className="field">
            <span>Qısa tagline</span>
            <input
              name="tagline"
              type="text"
              defaultValue={editingCompany?.tagline ?? ""}
              placeholder="Gənclər üçün açıq məhsul və dizayn rolları."
              required
            />
          </label>

          <div className="grid-two">
            <label className="field">
              <span>Sektor</span>
              <input
                name="sector"
                type="text"
                defaultValue={editingCompany?.sector ?? ""}
                placeholder="Collaboration SaaS"
                required
              />
            </label>

            <label className="field">
              <span>Komanda ölçüsü</span>
              <input
                name="size"
                type="text"
                defaultValue={editingCompany?.size ?? ""}
                placeholder="1.001-5.000 əməkdaş"
                required
              />
            </label>
          </div>

          <div className="grid-two">
            <label className="field">
              <span>Lokasiya</span>
              <input
                name="location"
                type="text"
                defaultValue={editingCompany?.location ?? ""}
                placeholder="Amsterdam, Niderland"
                required
              />
            </label>

            <label className="field">
              <span>Website</span>
              <input
                name="website"
                type="url"
                defaultValue={editingCompany?.website ?? ""}
                placeholder="https://miro.com"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Logo URL</span>
            <input
              name="logo"
              type="url"
              defaultValue={editingCompany?.logo ?? ""}
              placeholder="https://..."
              required
            />
          </label>

          <label className="field">
            <span>Cover URL</span>
            <input
              name="cover"
              type="url"
              defaultValue={editingCompany?.cover ?? ""}
              placeholder="https://..."
              required
            />
          </label>

          <label className="field">
            <span>Haqqında</span>
            <textarea
              name="about"
              rows={4}
              defaultValue={editingCompany?.about ?? ""}
              placeholder="Şirkətin gənclərə necə uyğun olduğunu qısa izah et."
              required
            />
          </label>

          <label className="field">
            <span>Fokus sahələri</span>
            <textarea
              name="focusAreas"
              rows={3}
              defaultValue={editingCompany ? joinTextarea(editingCompany.focusAreas) : ""}
              placeholder={"Product design\nResearch\nData analytics"}
              required
            />
          </label>

          <label className="field">
            <span>Gənclər üçün təklif</span>
            <textarea
              name="youthOffer"
              rows={3}
              defaultValue={editingCompany ? joinTextarea(editingCompany.youthOffer) : ""}
              placeholder={"Mentor dəstəkli internship\nJunior rotasiya proqramı"}
              required
            />
          </label>

          <label className="field">
            <span>Üstünlüklər</span>
            <textarea
              name="benefits"
              rows={3}
              defaultValue={editingCompany ? joinTextarea(editingCompany.benefits) : ""}
              placeholder={"Hibrid iş modeli\nTəlim büdcəsi\nMentorluq"}
              required
            />
          </label>

          <label className="field field--checkbox">
            <span>Featured company kimi göstər</span>
            <input name="featured" type="checkbox" defaultChecked={editingCompany?.featured ?? true} />
          </label>

          {companyState ? (
            <p className={`notice ${companyState.kind === "error" ? "notice--error" : "notice--success"}`}>
              {companyState.message}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={isSubmittingCompany}>
            {isSubmittingCompany
              ? "Yadda saxlanır..."
              : editingCompany
                ? "Şirkət profilini yenilə"
                : "Şirkət profilini yarat"}
          </button>
        </form>
      </section>

      <section className="detail-panel admin-section">
        <div className="admin-panel-header">
          <div>
            <p className="eyebrow">Vakansiya idarəsi</p>
            <h2>{editingJob ? "Vakansiyanı redaktə et" : "Yeni youth-role vakansiya əlavə et"}</h2>
          </div>
          {editingJob ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setEditingJobSlug(null);
                setJobState(null);
              }}
            >
              Ləğv et
            </button>
          ) : null}
        </div>

        <p>
          Səviyyə yalnız internship, junior, trainee və yeni məzun ola bilər. Vakansiyanın featured
          bannerə düşməsi üçün bağlı şirkət featured olmalıdır.
        </p>

        <form
          key={editingJob?.slug ?? "job-create"}
          className="stack-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;

            startTransition(() => {
              void submitJob(new FormData(form), form);
            });
          }}
        >
          <label className="field">
            <span>Vakansiya adı</span>
            <input
              name="title"
              type="text"
              defaultValue={editingJob ? getPrimaryLocalizedText(editingJob.title) : ""}
              placeholder="Məsələn: Data Analyst Intern"
              required
            />
          </label>

          <div className="grid-two">
            <label className="field">
              <span>Şirkət</span>
              <select name="companySlug" defaultValue={editingJob?.companySlug ?? companies[0]?.slug ?? ""} required>
                {companies.map((company) => (
                  <option key={company.slug} value={company.slug}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Şəhər</span>
              <select name="city" defaultValue={editingJob?.city ?? availableCities[0]} required>
                {availableCities
                  .filter((city) => city !== "Hamısı")
                  .map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="grid-two">
            <label className="field">
              <span>İş modeli</span>
              <select
                name="workModel"
                defaultValue={editingJob?.workModel ?? workModels[1]}
                required
              >
                {workModels
                  .filter((item) => item !== "Hamısı")
                  .map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
              </select>
            </label>

            <label className="field">
              <span>Səviyyə</span>
              <select name="level" defaultValue={editingJob?.level ?? jobLevels[1]} required>
                {jobLevels
                  .filter((item) => item !== "Hamısı")
                  .map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="grid-two">
            <label className="field">
              <span>Kateqoriya</span>
              <input
                name="category"
                type="text"
                defaultValue={editingJob ? getPrimaryLocalizedText(editingJob.category) : ""}
                placeholder="Data və analitika"
                required
              />
            </label>

            <label className="field">
              <span>Paylaşılma tarixi</span>
              <input
                name="postedAt"
                type="date"
                defaultValue={editingJob?.postedAt ?? todayValue()}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Son müraciət tarixi</span>
            <input
              name="deadline"
              type="date"
              defaultValue={editingJob?.deadline ?? deadlineValue()}
              required
            />
          </label>

          <label className="field">
            <span>Qısa xülasə</span>
            <textarea
              name="summary"
              rows={4}
              defaultValue={editingJob ? getPrimaryLocalizedText(editingJob.summary) : ""}
              placeholder="Rolun əsas təsir sahəsini 2-3 cümlə ilə yaz."
              required
            />
          </label>

          <label className="field">
            <span>Məsuliyyətlər</span>
            <textarea
              name="responsibilities"
              rows={4}
              defaultValue={editingJob ? joinTextarea(editingJob.responsibilities) : ""}
              placeholder={"Dashboard hazırlamaq\nKomanda ilə weekly sync etmək"}
              required
            />
          </label>

          <label className="field">
            <span>Tələblər</span>
            <textarea
              name="requirements"
              rows={4}
              defaultValue={editingJob ? joinTextarea(editingJob.requirements) : ""}
              placeholder={"SQL biliyi\nAnalitik düşüncə"}
              required
            />
          </label>

          <label className="field">
            <span>Üstünlüklər</span>
            <textarea
              name="benefits"
              rows={4}
              defaultValue={editingJob ? joinTextarea(editingJob.benefits) : ""}
              placeholder={"Mentorluq\nHibrid iş modeli"}
              required
            />
          </label>

          <label className="field">
            <span>Tag-lər</span>
            <textarea
              name="tags"
              rows={3}
              defaultValue={editingJob ? joinTextarea(editingJob.tags) : ""}
              placeholder={"SQL\nIntern\nGrowth"}
              required
            />
          </label>

          {jobState ? (
            <p className={`notice ${jobState.kind === "error" ? "notice--error" : "notice--success"}`}>
              {jobState.message}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={isSubmittingJob}>
            {isSubmittingJob
              ? "Yadda saxlanır..."
              : editingJob
                ? "Vakansiyanı yenilə"
                : "Vakansiyanı yarat"}
          </button>
        </form>
      </section>

      <section className="dashboard-panel admin-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Şirkət siyahısı</p>
            <h2>Mövcud company profilləri</h2>
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="empty-state">
            <p>Hələ heç bir şirkət profili yoxdur.</p>
          </div>
        ) : (
          <div className="dashboard-list">
            {companies.map((company) => (
              <div key={company.slug} className="dashboard-item admin-item">
                <div className="admin-item__meta">
                  <strong className="admin-item__title">
                    <span>{company.name}</span>
                    <VerifiedBadge compact />
                  </strong>
                  <span>
                    {company.sector} • {company.location}
                  </span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => {
                      setEditingCompanySlug(company.slug);
                      setCompanyState(null);
                    }}
                  >
                    Redaktə et
                  </button>
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => void removeCompany(company.slug)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-panel admin-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Vakansiya siyahısı</p>
            <h2>Mövcud youth-role elanları</h2>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <p>Hələ heç bir vakansiya yoxdur.</p>
          </div>
        ) : (
          <div className="dashboard-list">
            {jobs.map((job) => {
              const company = companies.find((item) => item.slug === job.companySlug);

              return (
                <div key={job.slug} className="dashboard-item admin-item">
                  <div className="admin-item__meta">
                    <strong>{getPrimaryLocalizedText(job.title)}</strong>
                    <span>
                      {company?.name ?? job.companySlug} • {job.city} • {job.deadline}
                    </span>
                  </div>
                  <div className="admin-inline-actions">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => {
                        setEditingJobSlug(job.slug);
                        setJobState(null);
                      }}
                    >
                      Redaktə et
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => void removeJob(job.slug)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
