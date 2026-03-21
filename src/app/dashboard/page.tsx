import { AccessGate } from "@/components/access-gate";
import { DashboardClient } from "@/components/dashboard-client";
import { getCompanies, getJobs } from "@/lib/platform";
import { getSessionRole } from "@/lib/session";

export default async function DashboardPage() {
  const role = await getSessionRole();

  if (!role) {
    return (
      <AccessGate
        eyebrow="Müvəqqəti bağlıdır"
        title="Namizəd paneli hazırda deaktivdir"
        description="Namizəd giriş və qeydiyyat axını hələ açılmayıb. Hazırda yalnız açıq vakansiya və karyera resursları aktivdir."
        actionHref="/jobs"
        actionLabel="Vakansiyalara bax"
      />
    );
  }

  if (role !== "candidate") {
    return (
      <AccessGate
        eyebrow="Giriş rolu uyğun deyil"
        title="Bu səhifə yalnız namizədlər üçündür"
        description="Admin hesabı ilə daxil olmusan. Namizəd paneli hazırkı mərhələdə ictimai istifadə üçün açıq deyil."
        actionHref="/jobs"
        actionLabel="Vakansiyalara bax"
      />
    );
  }

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">Namizəd paneli</p>
          <h1>Yadda saxladıqlarını və müraciətlərini bir yerdə izlət</h1>
          <p>
            Bu MVP paneli local storage üzərində işləyir. Yadda saxladığın və müraciət etdiyin
            vakansiyalar sessiyalar arasında saxlanılır.
          </p>
        </div>

        <DashboardClient jobs={getJobs()} companies={getCompanies()} />
      </div>
    </main>
  );
}
