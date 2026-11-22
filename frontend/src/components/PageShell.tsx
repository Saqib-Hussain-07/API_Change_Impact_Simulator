/**
 * PageShell — Wraps the landing page with the Vyro scroll-reveal layout.
 *
 * The outer container is dark (#09090b). The white `.page-sheet` sits above
 * the sticky footer with a rounded bottom. As the user scrolls down, the
 * sheet slides up to uncover the dark footer; scrolling back covers it again.
 */

import { StickyFooter } from './StickyFooter';

interface PageShellProps {
  children: React.ReactNode;
  onManageCookies?: () => void;
}

export function PageShell({ children, onManageCookies }: PageShellProps) {
  return (
    <div className="vyro-shell">
      {/* White content sheet — sits above sticky footer via z-index */}
      <div className="page-sheet">{children}</div>

      {/* Dark sticky footer — pinned at the bottom of the viewport */}
      <StickyFooter onManageCookies={onManageCookies} />
    </div>
  );
}
