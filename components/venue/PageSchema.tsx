import { breadcrumbJsonLd, serviceJsonLd, jsonLdScript, type Crumb } from '@/lib/site-schema';

interface PageSchemaProps {
  /** Page path, e.g. "/weddings" */
  path: string;
  /**
   * Breadcrumb trail BELOW Home — the helper prepends Home itself. A crumb
   * without a path renders as a plain name, which is what you want for the
   * current page and for grouping labels like "Events" that have no route.
   */
  crumbs: Crumb[];
  /**
   * The revenue line this page sells, if it sells one. Emitting a Service
   * with a real starting price is what lets Google show "from $X" rather
   * than inferring nothing; pass the lowest genuine rate for the offering,
   * always read from app/lib/venue-rates.ts and never typed by hand.
   */
  service?: {
    name: string;
    description: string;
    priceFrom: number;
    serviceType?: string;
  };
}

/**
 * The two JSON-LD nodes every event-type page should carry beyond its own
 * EventVenue and FAQPage blocks: a BreadcrumbList (a standard SERP
 * enhancement that none of these pages had) and a priced Service.
 *
 * Server component — the markup must be in the initial HTML.
 */
export default function PageSchema({ path, crumbs, service }: PageSchemaProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(path, crumbs))}
      />
      {service && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(serviceJsonLd({ path, ...service }))}
        />
      )}
    </>
  );
}
