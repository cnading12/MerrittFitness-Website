import { Metadata } from 'next';
import { events, Event } from '@/app/data/events';
import { contact, specs } from '@/app/data/site';
import {
  BUSINESS_ID,
  postalAddress,
  geoCoordinates,
  jsonLdScript,
  breadcrumbJsonLd,
} from '@/lib/site-schema';

export const metadata: Metadata = {
  title: "What's On | Sound Baths, Breathwork, Yoga & Live Music in Sloans Lake, Denver",
  description:
    "Upcoming public events at Merritt Wellness in Denver's Sloans Lake: sound baths and sound immersions, breathwork gatherings, yin and vinyasa yoga, salsa and bachata classes, songwriters' rounds, and community circles in a historic 1905 sanctuary. Times, prices, and booking links for every session.",
  keywords: [
    'sound bath Denver',
    'breathwork Denver',
    'yoga classes Sloans Lake',
    'salsa classes Denver',
    'bachata classes Denver',
    'wellness events Denver',
    'live music Sloans Lake Denver',
    'community events Denver',
    'things to do in Sloans Lake',
  ],
  openGraph: {
    title: "What's On | Sound Baths, Breathwork, Yoga & Live Music in Denver",
    description:
      "Sound baths, breathwork, yoga, dance classes, and live music open to the public in a historic 1905 sanctuary in Denver's Sloans Lake. Times, prices, and booking links.",
    url: 'https://merrittwellness.net/calendar',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://merrittwellness.net/images/hero/1.webp',
        width: 1200,
        height: 630,
        alt: 'Merritt Wellness Events - Sound Baths and Yoga Workshops in Denver',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "What's On | Merritt Wellness Denver",
    description:
      "Sound baths, breathwork, yoga, dance classes, and live music open to the public in a historic 1905 sanctuary in Denver's Sloans Lake.",
    images: ['https://merrittwellness.net/images/hero/1.webp'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/calendar',
  },
};

const BASE_URL = 'https://merrittwellness.net';

// Returns the America/Denver UTC offset (e.g. "-06:00" / "-07:00") for a given date,
// so Event startDate/endDate carry an accurate timezone per DST rules.
function denverOffset(isoDate: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      timeZoneName: 'longOffset',
    }).formatToParts(new Date(`${isoDate}T12:00:00Z`));
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-07:00';
    const match = tz.match(/GMT([+-]\d{2}:?\d{2})/);
    if (match) return match[1].includes(':') ? match[1] : `${match[1].slice(0, 3)}:${match[1].slice(3)}`;
  } catch {
    /* fall through to default */
  }
  return '-07:00';
}

// Convert a 12-hour time like "7:30 PM" to 24-hour "19:30". Returns null if unparseable.
function to24Hour(time?: string): string | null {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Build an ISO 8601 datetime with the correct Denver offset, e.g. "2026-05-21T18:00:00-06:00".
function toIsoDateTime(date: string, time?: string): string {
  const t = to24Hour(time);
  if (!t) return date; // date-only is still valid for schema.org
  return `${date}T${t}:00${denverOffset(date)}`;
}

function absoluteImage(url: string): string {
  if (!url) return `${BASE_URL}/images/hero/1.webp`;
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

// Keep events whose final relevant date is today or later. An open-ended recurring
// series has no final date, so it is always kept; one with an endDate expires like
// any other event once that date passes.
function isUpcoming(event: Event): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (event.recurrence && !event.endDate) return true;
  const last = event.endDate || event.date;
  return new Date(`${last}T23:59:59`) >= today;
}

const DAY_URIS: Record<string, string> = {
  sunday: 'https://schema.org/Sunday',
  monday: 'https://schema.org/Monday',
  tuesday: 'https://schema.org/Tuesday',
  wednesday: 'https://schema.org/Wednesday',
  thursday: 'https://schema.org/Thursday',
  friday: 'https://schema.org/Friday',
  saturday: 'https://schema.org/Saturday',
};

/**
 * Turn the human `recurrence` string ("Every Thursday", "Every Monday,
 * Wednesday & Friday", "Third Thursday of every month") into a schema.org
 * Schedule. Returns null for one-off events and for any phrasing we cannot
 * parse confidently — a wrong schedule is worse than none, so this only ever
 * emits what it is sure of.
 */
function eventScheduleFor(event: Event): Record<string, unknown> | null {
  if (!event.recurrence) return null;

  const text = event.recurrence.toLowerCase();
  const days = Object.keys(DAY_URIS)
    .filter((day) => text.includes(day))
    .map((day) => DAY_URIS[day]);
  if (days.length === 0) return null;

  const schedule: Record<string, unknown> = {
    '@type': 'Schedule',
    byDay: days,
    startDate: event.date,
    scheduleTimezone: 'America/Denver',
  };

  const startTime = to24Hour(event.time);
  if (startTime) schedule.startTime = startTime;
  const endTime = to24Hour(event.endTime);
  if (endTime) schedule.endTime = endTime;
  if (event.endDate) schedule.endDate = event.endDate;

  // "Third Thursday of every month" / "First Saturday of every month"
  const weekOfMonth = ['first', 'second', 'third', 'fourth'].indexOf(
    (text.match(/\b(first|second|third|fourth)\b/) || [])[1] || ''
  );
  if (text.includes('month')) {
    schedule.repeatFrequency = 'P1M';
    if (weekOfMonth >= 0) schedule.byMonthWeek = weekOfMonth + 1;
  } else if (text.includes('every')) {
    schedule.repeatFrequency = 'P1W';
  }

  return schedule;
}

function buildEventSchema(event: Event) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${BASE_URL}/calendar#${event.id}`,
    // Every event needs its own URL. Without one all 39 events resolved to a
    // bare /calendar and were indistinguishable to a crawler; the matching
    // anchor id is rendered on each card in app/calendar/page.tsx.
    url: `${BASE_URL}/calendar#${event.id}`,
    name: event.title,
    description: event.description,
    startDate: toIsoDateTime(event.date, event.time),
    image: [absoluteImage(event.imageUrl)],
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: 'en-US',
    maximumAttendeeCapacity: specs.capacity,
    // The Place carries the full NAP and links to the site-wide business
    // node, so the venue is one entity across the whole graph rather than a
    // fresh unnamed Place per event.
    location: {
      '@type': ['Place', 'EventVenue'],
      '@id': BUSINESS_ID,
      name: 'Merritt Wellness',
      url: BASE_URL,
      address: postalAddress,
      geo: geoCoordinates,
      maximumAttendeeCapacity: specs.capacity,
    },
    organizer: {
      '@type': 'Organization',
      name: 'Merritt Wellness',
      url: BASE_URL,
      telephone: contact.inquiries.phoneE164,
    },
  };

  if (event.endTime) {
    schema.endDate = toIsoDateTime(event.endDate || event.date, event.endTime);
  } else if (event.endDate) {
    schema.endDate = toIsoDateTime(event.endDate, event.time);
  }

  if (event.practitionerName) {
    schema.performer = { '@type': 'Person', name: event.practitionerName };
  }

  // Recurring series get a machine-readable schedule rather than only the
  // prose in `recurrence` ("Every Thursday"), which nothing can parse.
  const schedule = eventScheduleFor(event);
  if (schedule) schema.eventSchedule = schedule;

  // Offers. Google's Event spec requires `price` and `priceCurrency` whenever
  // an `offers` block is present, so a price is emitted whenever we know one.
  // Where no price is published (ticketing lives on an external page that
  // sets its own), the ticket link still ships — an offer with a URL and no
  // price is a warning, while inventing a price would be a lie.
  const offer: Record<string, unknown> | null =
    event.price || event.ticketUrl || event.free
      ? {
          '@type': 'Offer',
          url: event.ticketUrl || `${BASE_URL}/calendar#${event.id}`,
          availability: 'https://schema.org/InStock',
          priceCurrency: 'USD',
          validFrom: `${event.date}T00:00:00${denverOffset(event.date)}`,
        }
      : null;

  if (offer) {
    if (event.free) {
      offer.price = 0;
    } else if (event.price) {
      offer.price = event.price.from;
      if (event.price.to && event.price.to !== event.price.from) {
        offer.priceSpecification = {
          '@type': 'PriceSpecification',
          minPrice: event.price.from,
          maxPrice: event.price.to,
          priceCurrency: 'USD',
        };
      }
    }
    schema.offers = offer;
  }

  // Only assert free admission when the event is actually marked free. This
  // used to be inferred from "has no ticketUrl", which told Google that paid
  // Venmo-collected classes ($35 yoga, $15 donation classes) were free.
  if (event.free) schema.isAccessibleForFree = true;

  return schema;
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const eventSchemas = events.filter(isUpcoming).map(buildEventSchema);

  return (
    <>
      {eventSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(schema)}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd('/calendar', [{ name: "What's On" }])
        )}
      />
      {children}
    </>
  );
}
