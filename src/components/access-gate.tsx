import Link from "next/link";

type AccessGateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function AccessGate({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel
}: AccessGateProps) {
  return (
    <main className="section">
      <div className="shell">
        <div className="empty-state empty-state--large">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          {actionHref && actionLabel ? (
            <Link href={actionHref} className="button button--primary">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
