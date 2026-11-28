/**
 * StickyFooter — Vyro-style dark sticky footer with scroll-reveal.
 *
 * Customise by passing props or editing the BRAND / NAV / LEGAL / AI_ACTIONS
 * constants at the top of this file.
 */

import { useState } from 'react';

// ── Brand ────────────────────────────────────────────────────────────────────
const BRAND = {
  name: 'N DIFFER',
  tagline: 'Detect breaking API changes before they reach consumers.',
  version: 'v1.0.0-prod',
};

// ── Social links (SVG inline to avoid extra deps) ────────────────────────────
const SOCIALS: { label: string; href: string; icon: JSX.Element }[] = [
  {
    label: 'X (Twitter)',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    label: 'Discord',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
      </svg>
    ),
  },
];

// ── Footer nav columns ────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
}
interface NavColumn {
  heading: string;
  items: NavItem[];
}

// shortcut: cookie handler is a stub — wire onManageCookies prop to your real handler
const buildNavColumns = (onManageCookies: () => void): NavColumn[] => [
  {
    heading: 'Learn More',
    items: [
      { label: 'For API Producers', href: '#overview' },
      { label: 'For Consumer Teams', href: '#personas' },
      { label: 'Interactive Sandbox', href: '#demo' },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { label: 'Help Center', href: '#' },
      { label: 'Changelog', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Creator Terms', href: '#' },
      { label: 'Referral Terms', href: '#' },
      { label: 'Content Requirements', href: '#' },
      { label: 'Manage Cookies', onClick: onManageCookies },
    ],
  },
];

// ── AI action buttons ─────────────────────────────────────────────────────────
// Replace each `onClick` with your real AI handler / link
const AI_ACTIONS: { label: string; icon: JSX.Element; onClick: () => void }[] = [
  {
    label: 'ChatGPT',
    onClick: () => window.open('https://chatgpt.com/', '_blank'),
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  {
    label: 'Claude',
    onClick: () => window.open('https://claude.ai/', '_blank'),
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M4.709 15.955 10.189 2h3.579l1.512 4.489-.03.05L9.567 19.371l-.045.044zM14.374 22l4.361-12.249L22 2h-3.549l-5.467 15.4L14.37 22z" />
      </svg>
    ),
  },
  {
    label: 'Gemini',
    onClick: () => window.open('https://gemini.google.com/', '_blank'),
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M12 24A14.232 14.232 0 0 1 9.95 12 14.232 14.232 0 0 1 12 0a14.232 14.232 0 0 1 2.05 12A14.232 14.232 0 0 1 12 24zm0 0a14.232 14.232 0 0 1 12-2.05A14.232 14.232 0 0 1 24 12a14.232 14.232 0 0 1-12 2.05A14.232 14.232 0 0 1 0 12a14.232 14.232 0 0 1 12 2.05z" />
      </svg>
    ),
  },
  {
    label: 'Perplexity',
    onClick: () => window.open('https://www.perplexity.ai/', '_blank'),
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M22.197 0v9.986h-1.955V3.526l-7.678 7.063V24h-1.128V10.589L3.758 3.526v6.46H1.803V0h1.14l9.063 8.342L21.058 0zM3.758 14.014H1.803V24h1.955zm18.439 0h-1.955V24h1.955z" />
      </svg>
    ),
  },
  {
    label: 'Copilot',
    onClick: () => window.open('https://copilot.microsoft.com/', '_blank'),
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M23.9918 11.3447c-.0025-.1397-.01-.2793-.0203-.419-.0763-1.1735-.6065-2.3012-1.5406-3.0898-.6929-.5887-1.5355-.9452-2.4192-1.0674-.0966-.0127-.1931-.0203-.29-.0254-.0254-.0025-.0508-.0025-.0762-.0025h-5.1c-1.5584 0-2.6893-1.5126-2.2573-3.0049.1296-.4567.3912-.8692.753-1.1811.3618-.312.8133-.4974 1.279-.5283.1016-.0076.2057-.0076.3073.0025.1549.0127.3073.0457.4546.0965.7284.2514 1.2561.9376 1.2969 1.6977.0025.0508.0025.1016.0025.1524v.1626l1.9499.0025v-.1372c0-.1753-.0127-.3506-.038-.5208-.076-.4697-.2412-.9299-.4825-1.3341-.5563-.9375-1.4938-1.6189-2.5695-1.8906-.2947-.0762-.5995-.1143-.9018-.1118-1.5456.0025-2.9989.9579-3.5451 2.4121-.1016.2743-.169.558-.2057.8514-.0254.1956-.038.3912-.038.5868v.0254h-.3836C5.6726 3.1549 3.6213 5.2062 3.6213 7.7247v.1143c0 .0432.0025.0863.005.1296-.8947.4138-1.6673 1.0699-2.2192 1.9014-.5614.8438-.855 1.8347-.855 2.8484 0 1.0138.2936 2.0046.855 2.8484.5519.8315 1.3245 1.4876 2.2192 1.9014-.0025.0432-.005.0863-.005.1296v.1143c0 2.5185 2.0513 4.5698 4.5698 4.5698h.3836c0 .1956.0126.3912.038.5868.0381.2934.1041.5771.2057.8514.5462 1.4542 1.9995 2.4096 3.5451 2.4121.3023.0025.6071-.0356.9018-.1118 1.0757-.2717 2.0132-.9531 2.5695-1.8906.2413-.4042.4065-.8644.4825-1.3341.0253-.1702.038-.3455.038-.5208v-.1372l-1.9499.0025v.1626c0 .0508 0 .1016-.0025.1524-.0408.7601-.5685 1.4463-1.2969 1.6977-.1473.0508-.2997.0838-.4546.0965-.1016.0101-.2057.0101-.3073.0025-.4657-.0309-.9172-.2163-1.279-.5283-.3618-.312-.6234-.7244-.753-1.1811-.432-1.4923.6989-3.0049 2.2573-3.0049h5.1c.0254 0 .0508 0 .0762-.0025.0969-.005.1934-.0127.29-.0254.8837-.1222 1.7263-.4787 2.4192-1.0674.9341-.7886 1.4643-1.9163 1.5406-3.0898.0103-.1397.0178-.2793.0203-.419.0025-.0711.0025-.1422.0025-.2133 0-.0711 0-.1422-.0025-.2133z" />
      </svg>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface StickyFooterProps {
  /** Called when user clicks "Manage Cookies" */
  onManageCookies?: () => void;
}

export function StickyFooter({ onManageCookies = () => {} }: StickyFooterProps) {
  const [cookieNotice, setCookieNotice] = useState(false);
  const navColumns = buildNavColumns(() => {
    onManageCookies();
    setCookieNotice(true);
    setTimeout(() => setCookieNotice(false), 3000);
  });

  return (
    <footer className="vyro-sticky-footer" aria-label="Site footer">
      <div className="vyro-footer-inner">
        {/* ── Top grid: brand + nav ── */}
        <div className="vyro-footer-top">
          {/* Left: brand column */}
          <div className="vyro-footer-brand">
            {/* Logo wordmark */}
            <span className="vyro-footer-wordmark">{BRAND.name}</span>

            {/* Tagline */}
            <p className="vyro-footer-tagline">{BRAND.tagline}</p>

            {/* Social icons */}
            <div className="vyro-footer-socials">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="vyro-footer-social-btn"
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Status pill */}
            <div className="vyro-footer-status-pill">
              <span className="vyro-footer-status-dot" aria-hidden />
              <span>All systems operational</span>
            </div>
          </div>

          {/* Right: 3-column nav */}
          <nav className="vyro-footer-nav" aria-label="Footer navigation">
            {navColumns.map((col) => (
              <div key={col.heading}>
                <p className="vyro-footer-nav-heading">{col.heading}</p>
                <ul className="vyro-footer-nav-list">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className="vyro-footer-nav-link"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <a href={item.href} className="vyro-footer-nav-link">
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* ── Divider ── */}
        <div className="vyro-footer-divider" />

        {/* ── Bottom bar ── */}
        <div className="vyro-footer-bottom">
          <span className="vyro-footer-copy">© {BRAND.name} 2026</span>

          <div className="vyro-footer-ai-row">
            <span className="vyro-footer-ai-label">Ask AI about {BRAND.name}</span>
            {AI_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                title={a.label}
                aria-label={`Ask ${a.label}`}
                className="vyro-footer-ai-btn"
              >
                {a.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Cookie notice toast */}
        {cookieNotice && (
          <div className="vyro-footer-cookie-toast" role="status" aria-live="polite">
            Cookie preferences panel opening…
          </div>
        )}
      </div>
    </footer>
  );
}
