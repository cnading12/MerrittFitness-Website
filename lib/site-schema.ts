// The site-wide JSON-LD graph: ONE business node, one website node, and the
// shared helpers every page uses to reference them.
//
// WHY THIS FILE EXISTS
// --------------------
// The root layout and the homepage each used to emit their own LocalBusiness
// block under the same @id. They disagreed: one declared priceRange "$$" and
// the other "$95/hour" (not a valid priceRange at all), geo coordinates were
// numbers in one and strings in the other, and `areaServed` was nested inside
// PostalAddress, where schema.org does not define it. Crawlers merging two
// conflicting nodes under one @id is the worst case — you cannot predict
// which values survive. So the graph is built here, once, and rendered once
// from the root layout.
//
// RULES
// -----
// 1. Every page that needs a business reference uses { '@id': BUSINESS_ID }
//    rather than repeating the business properties.
// 2. Prices come from app/lib/venue-rates.ts, which derives them from the
//    booking engine's own constants. Never hardcode a dollar figure here.
// 3. aggregateRating comes from `reviews` in app/data/site.ts and must stay
//    tied to real, verifiable Google reviews. See the warning on that export.

import { contact, specs, hours, reviews, areaServed, workspace } from '@/app/data/site';
import { rateBands } from '@/app/lib/venue-rates';

// CANONICAL HOST — www, and it is not arbitrary.
//
// www.merrittwellness.net is the host that actually serves the site; the apex
// redirects to it at the platform level:
//
//   curl -sSIL https://merrittwellness.net
//   HTTP/2 307
//   location: https://www.merrittwellness.net/
//   HTTP/2 200
//
// Everything derived from this constant — canonicals, metadataBase, sitemap
// URLs, OG urls, and every schema @id — used to declare the apex instead, so
// every canonical tag pointed at a URL that redirected to a different host.
// That is also why Google has www URLs in its index while the site claimed
// the apex, and it matches the Business Profile's Website field.
//
// To move the canonical to the apex later: change the PLATFORM redirect
// first, then this constant, then the guard in tests/seo-invariants.test.mjs.
// Never do it by adding a redirect in middleware.js — the platform redirect
// points the other way and the two would loop forever.
export const BASE_URL = 'https://www.merrittwellness.net';
export const BUSINESS_ID = `${BASE_URL}/#business`;
export const WEBSITE_ID = `${BASE_URL}/#website`;

const LOGO_URL = `${BASE_URL}/web-app-manifest-512x512.png`;

/** Lowest and highest published hourly rates, for priceRange. */
const lowestRate = Math.min(...rateBands.map((b) => b.weekday));
const highestRate = Math.max(...rateBands.map((b) => b.saturday));

/**
 * The venue's postal address. Shared by every node that needs it so the NAP
 * can never drift between blocks.
 */
export const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: contact.address.street,
  addressLocality: contact.address.city,
  addressRegion: contact.address.state,
  postalCode: contact.address.zip,
  addressCountry: 'US',
} as const;

export const geoCoordinates = {
  '@type': 'GeoCoordinates',
  latitude: contact.address.lat,
  longitude: contact.address.lng,
} as const;

/**
 * One Offer per revenue line, each carrying the real entry price so Google
 * can surface "from $X" rather than guessing. Hourly rates use a
 * UnitPriceSpecification with unitCode HUR (the UN/CEFACT code for hours);
 * anything else would read as a flat fee.
 */
function serviceOffers() {
  const hourly = (price: number) => ({
    '@type': 'Offer',
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price,
      priceCurrency: 'USD',
      unitCode: 'HUR',
      minPrice: price,
    },
    availability: 'https://schema.org/InStock',
    areaServed: { '@type': 'City', name: 'Denver' },
  });

  const lines: Array<{ name: string; description: string; url: string; price: number }> = [
    {
      name: 'Wedding Venue Rental',
      description:
        'Ceremonies and receptions in a restored 1905 sanctuary with 24-foot vaulted ceilings, original stained glass, and room for up to 125 guests. Saturdays, plus Friday and Sunday evening weddings.',
      url: `${BASE_URL}/weddings`,
      price: rateBands[rateBands.length - 1].saturday,
    },
    {
      name: 'Wellness & Movement Class Space',
      description:
        'Studio space for yoga, breathwork, sound baths, dance, and martial arts, as a one-time workshop, a pop-up series, or a standing weekly block. Full-coverage floor mat and 15 feet of rollaway mirrors on site.',
      url: `${BASE_URL}/class-partnerships`,
      price: rateBands[0].weekday,
    },
    {
      name: 'Recurring Booking Partnership',
      description:
        'A standing weekly block in the main hall at partner rates, with simple monthly billing. For instructors, congregations, rehearsals, and community groups booking 8 or more hours a month.',
      url: `${BASE_URL}/recurring`,
      price: rateBands[0].weekdayRecurring,
    },
    {
      name: 'Private Event Venue Rental',
      description:
        'Celebrations of life and memorials, birthdays, quinceañeras, showers, graduations, anniversaries, and corporate offsites in a historic 1905 event center for up to 125 guests.',
      url: `${BASE_URL}/private-events`,
      price: rateBands[0].weekday,
    },
    {
      name: 'Concert & Performance Venue Rental',
      description:
        'Live music, recitals, album releases, and performances in a hall built for sound, with a house surround system and a cafe lounge for intermission.',
      url: `${BASE_URL}/concerts`,
      price: rateBands[0].weekday,
    },
    {
      name: 'Art Show & Exhibition Space',
      description:
        'Gallery openings, exhibitions, and pop-up artist markets under natural light, with hardwood floors and tall walls that let the work carry the room.',
      url: `${BASE_URL}/art-shows`,
      price: rateBands[0].weekday,
    },
    {
      name: 'Congregation & Worship Space',
      description:
        'A 1905 sanctuary open to congregations and spiritual communities of every tradition, on flat monthly rates. Two churches already meet here each Sunday.',
      url: `${BASE_URL}/congregations`,
      price: rateBands[0].weekdayRecurring,
    },
    {
      name: 'Practitioner Studio & Workspace',
      description:
        'Studio and office space for Denver practitioners, including dedicated desks and private offices next door at Merritt Workspace with venue hours included in membership.',
      url: `${BASE_URL}/studio`,
      price: rateBands[0].weekday,
    },
  ];

  return lines.map((line) => ({
    '@type': 'Offer',
    ...hourly(line.price),
    itemOffered: {
      '@type': 'Service',
      name: line.name,
      description: line.description,
      url: line.url,
      serviceType: line.name,
      provider: { '@id': BUSINESS_ID },
      areaServed: [
        ...areaServed.cities.map((name) => ({ '@type': 'City', name, containedInPlace: 'Colorado, US' })),
      ],
    },
  }));
}

/**
 * The canonical business node. Typed as LocalBusiness + EventVenue +
 * HealthAndBeautyBusiness: the venue is genuinely all three, and listing the
 * most specific applicable types is what schema.org asks for.
 */
function businessNode() {
  return {
    '@type': ['LocalBusiness', 'EventVenue', 'HealthAndBeautyBusiness'],
    '@id': BUSINESS_ID,
    name: 'Merritt Wellness',
    alternateName: 'Merritt Wellness Denver',
    legalName: 'Merritt Wellness',
    description:
      "A restored 1905 sanctuary in Denver's Sloans Lake neighborhood, hosting weddings, private events, concerts, art shows, congregations, and wellness and movement classes under 24-foot vaulted ceilings.",
    url: BASE_URL,
    telephone: contact.inquiries.phoneE164,
    email: contact.inquiries.email,
    address: postalAddress,
    geo: geoCoordinates,
    hasMap: `https://maps.google.com/?q=${encodeURIComponent(
      `${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}`
    )}`,
    logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512 },
    image: [
      `${BASE_URL}/images/hero/1.webp`,
      `${BASE_URL}/images/pages/venue/main-hall-rose-window.webp`,
      `${BASE_URL}/images/pages/venue/sunlit-hall.webp`,
    ],
    foundingDate: String(specs.built),
    // Hours live in one constant; the legacy `openingHours` string is kept
    // alongside the structured form because some consumers still read it.
    // Sunday is a separate entry because congregations hold the sanctuary
    // until 4:30 PM — collapsing all seven days into one range is what made
    // this disagree with the Google Business Profile.
    openingHours: [
      `Mo-Sa ${hours.weekdayOpens}-${hours.weekdayCloses}`,
      `Su ${hours.sundayOpens}-${hours.sundayCloses}`,
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: hours.weekdayOpens,
        closes: hours.weekdayCloses,
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday'],
        opens: hours.sundayOpens,
        closes: hours.sundayCloses,
      },
    ],
    // A range, not a single figure. "$95/hour" is not a valid priceRange —
    // the property expects either a currency-symbol band or a range string.
    priceRange: `$${lowestRate}-$${highestRate}`,
    currenciesAccepted: 'USD',
    paymentAccepted: ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Venmo', 'Zelle'],
    // areaServed belongs on the business, NOT inside PostalAddress, where
    // schema.org does not define it.
    areaServed: [
      ...areaServed.cities.map((name) => ({
        '@type': 'City',
        name,
        containedInPlace: { '@type': 'State', name: 'Colorado' },
      })),
      ...areaServed.neighborhoods.map((name) => ({
        '@type': 'Place',
        name,
        containedInPlace: { '@type': 'City', name: 'Denver' },
      })),
    ],
    maximumAttendeeCapacity: specs.capacity,
    smokingAllowed: false,
    isAccessibleForFree: false,
    publicAccess: false,
    knowsAbout: [
      'Wedding venue rental',
      'Private event venue rental',
      'Sound bath and sound healing',
      'Breathwork',
      'Yoga class space rental',
      'Dance class space rental',
      'Concert and performance venue rental',
      'Art exhibition space',
      'Congregation and worship space rental',
      'Celebration of life and memorial venue',
    ],
    sameAs: [contact.social.instagram, contact.social.facebook, workspace.url],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: reviews.ratingValue,
      bestRating: reviews.bestRating,
      reviewCount: reviews.count,
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Historic 1905 architecture', value: true },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Vaulted ceilings',
        value: `${specs.ceilingFeet} feet`,
      },
      { '@type': 'LocationFeatureSpecification', name: 'Original stained glass', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Surround sound system', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Projector and screen', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Air conditioning', value: true },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'On-site parking',
        value: `${specs.parkingSpots} spots`,
      },
      { '@type': 'LocationFeatureSpecification', name: 'Cafe lounge area', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Breakout rooms', value: true },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Rollaway mirrors',
        value: `${specs.mirrorFeet} feet`,
      },
      { '@type': 'LocationFeatureSpecification', name: 'Full-coverage floor mat', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Wheelchair ramp at front entrance', value: true },
    ],
    makesOffer: serviceOffers(),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Venue rental and partnerships',
      itemListElement: serviceOffers(),
    },
  };
}

function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: BASE_URL,
    name: 'Merritt Wellness',
    description:
      "Historic 1905 event, wedding, and wellness venue in Denver's Sloans Lake neighborhood.",
    publisher: { '@id': BUSINESS_ID },
    inLanguage: 'en-US',
  };
}

/**
 * The whole site-wide graph, rendered ONCE from the root layout. Individual
 * pages add their own nodes (EventVenue, FAQPage, BreadcrumbList, Event) that
 * point back here by @id.
 */
export function siteGraphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [businessNode(), websiteNode()],
  };
}

export interface Crumb {
  name: string;
  /** Site-relative path, e.g. "/weddings". Omit on the current page. */
  path?: string;
}

/**
 * BreadcrumbList for an interior page. Always starts at Home, so callers pass
 * only the trail below it:
 *
 *   breadcrumbJsonLd('/weddings', [{ name: 'Events' }, { name: 'Weddings' }])
 *
 * A crumb without a `path` is rendered as a plain name — correct for the
 * current page and for grouping labels like "Events" that have no route of
 * their own.
 */
export function breadcrumbJsonLd(path: string, trail: Crumb[]) {
  const crumbs: Crumb[] = [{ name: 'Home', path: '/' }, ...trail];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${BASE_URL}${path}#breadcrumbs`,
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${BASE_URL}${crumb.path}` } : {}),
    })),
  };
}

/**
 * A Service node for a single revenue line, with its real starting price.
 * Pages render this next to their EventVenue node so the offering itself is
 * described, not just the room it happens in.
 */
export function serviceJsonLd(options: {
  path: string;
  name: string;
  description: string;
  /** Lowest real hourly rate for this service */
  priceFrom: number;
  serviceType?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}${options.path}#service`,
    name: options.name,
    description: options.description,
    serviceType: options.serviceType || options.name,
    url: `${BASE_URL}${options.path}`,
    provider: { '@id': BUSINESS_ID },
    areaServed: areaServed.cities.map((name) => ({ '@type': 'City', name })),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}${options.path}`,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: options.priceFrom,
        priceCurrency: 'USD',
        unitCode: 'HUR',
        minPrice: options.priceFrom,
      },
    },
  };
}

/** Renders a JSON-LD object as a <script> tag's inner HTML. */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data) };
}
