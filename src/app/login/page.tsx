import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="section">
      <div className="shell">
        <div className="empty-state empty-state--large">
          <p className="eyebrow">Müvəqqəti bağlıdır</p>
          <h1>Login və signup hazırda söndürülüb</h1>
          <p>
            İctimai namizəd giriş və qeydiyyat axını bu mərhələdə aktiv deyil. Admin hissəsi üçün
            ayrıca keçid istifadə olunur.
          </p>
          <div className="hero-actions">
            <Link href="/jobs" className="button button--primary">
              Vakansiyalara bax
            </Link>
            <Link href="/adminlog" className="button button--ghost">
              Admin keçidinə get
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
