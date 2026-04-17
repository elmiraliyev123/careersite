type VerifiedBadgeProps = {
  compact?: boolean;
  label?: string;
  profile?: boolean;
};

export function VerifiedBadge({
  compact = false,
  label = "Verified company",
  profile = false
}: VerifiedBadgeProps) {
  const size = compact ? (profile ? 19 : 15) : profile ? 24 : 17;
  return (
    <span
      className={`verified-badge${compact ? " verified-badge--compact" : ""}${profile ? " verified-badge--profile" : ""}`}
      aria-label={label}
      title={label}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 1.75 14.34 3.3l2.76-.37 1.38 2.42 2.67.77-.2 2.79 1.91 2.05-1.54 2.33.77 2.67-2.42 1.38-.37 2.76-2.79-.2L12 22.25 9.67 20.7l-2.77.37-1.38-2.42-2.67-.77.2-2.79-1.91-2.05 1.54-2.33-.77-2.67 2.42-1.38.37-2.76 2.79.2L12 1.75Z"
          fill="currentColor"
        />
        <path
          d="M12 2.9 14.06 4.27l2.43-.32 1.21 2.13 2.34.68-.17 2.45 1.68 1.79-1.35 2.05.68 2.34-2.13 1.21-.32 2.43-2.45-.17L12 21.1l-2.05-1.37-2.44.32-1.21-2.13-2.34-.68.17-2.45L2.46 12.99l1.35-2.05-.68-2.34 2.13-1.21.32-2.43 2.45.17L12 2.9Z"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="0.8"
        />
        <path
          d="m8.75 12.2 2.1 2.15 4.4-4.9"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
