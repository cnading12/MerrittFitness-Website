// JSON-LD builders for the venue marketing pages.
//
// Each event-type page renders an EventVenue node (linked to the site-wide
// LocalBusiness via @id) plus, where the page has an FAQ, a separate FAQPage
// node. Rendered with <script type="application/ld+json"> in server
// components.

import { contact, specs } from '@/app/data/site';

const BASE_URL = 'https://merrittwellness.net';

export interface VenueJsonLdOptions {
  /** Page path, e.g. "/weddings" */
  path: string;
  name?: string;
  description: string;
  /** Absolute or site-relative image paths */
  images: string[];
}

function absoluteUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
}

export function venueJsonLd({ path, name, description, images }: VenueJsonLdOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    '@id': `${BASE_URL}${path}#venue`,
    name: name || 'Merritt Wellness',
    description,
    url: `${BASE_URL}${path}`,
    image: images.map(absoluteUrl),
    telephone: contact.inquiries.phoneE164,
    email: contact.inquiries.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address.street,
      addressLocality: contact.address.city,
      addressRegion: contact.address.state,
      postalCode: contact.address.zip,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: contact.address.lat,
      longitude: contact.address.lng,
    },
    maximumAttendeeCapacity: specs.capacity,
    isAccessibleForFree: false,
    publicAccess: false,
    // Ties this venue node to the site-wide LocalBusiness graph node declared
    // in app/layout.tsx.
    containedInPlace: { '@id': `${BASE_URL}/#business` },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Surround sound system', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Projector and screen', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Air conditioning', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'On-site parking (22 spots)', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Cafe lounge area', value: true },
    ],
  };
}

export interface Faq {
  question: string;
  answer: string;
}

export function faqJsonLd(path: string, faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}${path}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
