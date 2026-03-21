"use client";

import Link from "next/link";
import { BriefcaseBusiness, Bookmark, CheckCircle2, Sparkles } from "lucide-react";

import { useCandidateActivity } from "@/hooks/useCandidateActivity";
import type { Company, Job } from "@/data/platform";
import { getPrimaryLocalizedText } from "@/lib/localized-content";

type DashboardClientProps = {
  jobs: Job[];
  companies: Company[];
};

export function DashboardClient({ jobs, companies }: DashboardClientProps) {
  const { savedJobs, appliedJobs } = useCandidateActivity();

  const saved = jobs.filter((job) => savedJobs.includes(job.slug));
  const applied = jobs.filter((job) => appliedJobs.includes(job.slug));
  const recommended = jobs.filter(
    (job) => !savedJobs.includes(job.slug) && !appliedJobs.includes(job.slug)
  ).slice(0, 4);

  const companyMap = new Map(companies.map((company) => [company.slug, company]));

  return (
    <div className="dashboard-grid">
      <div className="dashboard-panel dashboard-panel--stats">
        <div className="stat-card">
          <Bookmark size={18} />
          <div>
            <strong>{saved.length}</strong>
            <span>Yadda saxlanmış vakansiya</span>
          </div>
        </div>
        <div className="stat-card">
          <CheckCircle2 size={18} />
          <div>
            <strong>{applied.length}</strong>
            <span>Göndərilmiş müraciət</span>
          </div>
        </div>
        <div className="stat-card">
          <BriefcaseBusiness size={18} />
          <div>
            <strong>{jobs.length}</strong>
            <span>Platformadakı aktiv rol</span>
          </div>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Yadda saxlanılanlar</p>
            <h2>Sonradan baxmaq üçün seçdiklərin</h2>
          </div>
          <Link href="/jobs" className="text-link">
            Yeni vakansiyalar
          </Link>
        </div>

        {saved.length === 0 ? (
          <div className="empty-state">
            <p>Hələ heç bir vakansiyanı yadda saxlamamısan.</p>
            <Link href="/jobs" className="button button--primary">
              Vakansiya araşdır
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {saved.map((job) => (
              <Link key={job.slug} href={`/jobs/${job.slug}`} className="dashboard-item">
                <div>
                  <strong>{getPrimaryLocalizedText(job.title)}</strong>
                  <span>{companyMap.get(job.companySlug)?.name}</span>
                </div>
                <span>{job.city}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Müraciətlər</p>
            <h2>İzlədiyin müraciət axını</h2>
          </div>
        </div>

        {applied.length === 0 ? (
          <div className="empty-state">
            <p>Hələ heç bir müraciət göndərməmisən.</p>
            <Link href="/jobs" className="button button--ghost">
              İlk müraciətini et
            </Link>
          </div>
        ) : (
          <div className="dashboard-list">
            {applied.map((job) => (
              <Link key={job.slug} href={`/jobs/${job.slug}`} className="dashboard-item">
                <div>
                  <strong>{getPrimaryLocalizedText(job.title)}</strong>
                  <span>{companyMap.get(job.companySlug)?.name}</span>
                </div>
                <span>Müraciət edildi</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Tövsiyələr</p>
            <h2>Sənə uyğun ola biləcək növbəti addımlar</h2>
          </div>
          <Sparkles size={18} className="panel-icon" />
        </div>

        <div className="dashboard-list">
          {recommended.map((job) => (
            <Link key={job.slug} href={`/jobs/${job.slug}`} className="dashboard-item">
              <div>
                <strong>{getPrimaryLocalizedText(job.title)}</strong>
                <span>{companyMap.get(job.companySlug)?.name}</span>
              </div>
              <span>{job.level}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
