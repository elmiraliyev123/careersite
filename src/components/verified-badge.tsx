type VerifiedBadgeProps = {
  compact?: boolean;
  label?: string;
};

export function VerifiedBadge({ compact = false, label = "Verified company" }: VerifiedBadgeProps) {
  return (
    <span
      className={`verified-badge${compact ? " verified-badge--compact" : ""}`}
      aria-label={label}
      title={label}
    >
      <svg
        width={compact ? 24 : 30}
        height={compact ? 24 : 30}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 1.75 14.34 3.3l2.76-.37 1.38 2.42 2.67.77-.2 2.79 1.91 2.05-1.54 2.33.77 2.67-2.42 1.38-.37 2.76-2.79-.2L12 22.25 9.67 20.7l-2.77.37-1.38-2.42-2.67-.77.2-2.79-1.91-2.05 1.54-2.33-.77-2.67 2.42-1.38.37-2.76 2.79.2L12 1.75Z"
          fill="currentColor"
        />
        <path
          d="m8.75 12.2 2.1 2.15 4.4-4.9"
          stroke="#ffffff"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
