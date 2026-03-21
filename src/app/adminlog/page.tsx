import { redirect } from "next/navigation";

import { AdminLoginPanel } from "@/components/admin-login-panel";
import { getSessionRole } from "@/lib/session";

export default async function AdminLogPage() {
  const role = await getSessionRole();

  if (role === "admin") {
    redirect("/admin");
  }

  return (
    <main className="section">
      <div className="shell stack-lg">
        <div className="page-hero">
          <p className="eyebrow">AdminLog</p>
          <h1>Admin üçün ayrıca giriş keçidi</h1>
          <p>
            Bu səhifə sonradan `adminlog.senin-domenin.com` kimi ayrıca subdomain-ə bağlana
            bilər. Hazırda eyni tətbiq daxilində ayrı admin giriş ünvanı kimi işləyir və
            environment əsaslı parol ilə qorunur.
          </p>
        </div>

        <div className="detail-grid detail-grid--company">
          <AdminLoginPanel />

          <section className="detail-panel">
            <p className="eyebrow">Məhdud giriş</p>
            <h2>İctimai auth söndürülüb</h2>
            <p>
              Namizəd login və signup axını bu mərhələdə bağlanıb. Admin hissəsi yalnız
              ayrıca admin giriş səhifəsindən açılır.
            </p>
          </section>

          <section className="detail-panel">
            <p className="eyebrow">Növbəti addım</p>
            <h2>Subdomain konfiqurasiyası ayrıca deployment mərhələsində bağlanacaq</h2>
            <p>
              Deploy zamanı bu giriş nöqtəsini ayrıca admin subdomain-ə yönləndirmək və
              `ADMIN_LOGIN_PASSWORD` ilə `ADMIN_SESSION_SECRET` dəyərlərini təyin etmək kifayətdir.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
