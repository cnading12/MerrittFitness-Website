import type { Metadata } from 'next';

// Transactional page: reached only mid-booking, holds no content worth
// ranking, and would look like a thin duplicate of /book to a crawler. The
// noindex is declared here AND as an X-Robots-Tag in middleware.js, because
// robots.txt alone only asks crawlers not to fetch the URL — it does not stop
// one that arrives via a link from indexing it.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
