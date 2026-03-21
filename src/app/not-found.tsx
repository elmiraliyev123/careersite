import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section">
      <div className="shell">
        <div className="empty-state empty-state--large">
          <p className="eyebrow">404</p>
          <h1>Səhifə tapılmadı</h1>
          <p>Axtardığın vakansiya və ya şirkət artıq mövcud olmaya bilər.</p>
          <Link href="/" className="button button--primary">
            Ana səhifəyə qayıt
          </Link>
        </div>
      </div>
    </main>
  );
}
