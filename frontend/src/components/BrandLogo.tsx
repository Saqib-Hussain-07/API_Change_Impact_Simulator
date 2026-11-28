export function BrandLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Left stem + diagonal diff bridge + right stem forming an architectural N */}
      <path
        d="M4 20V4h3.5l9 11.4V4H20v16h-3.5l-9-11.4V20H4Z"
        fill="currentColor"
      />
      <rect x="4" y="4" width="3.5" height="3.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
