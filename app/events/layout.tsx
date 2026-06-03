import { Metadata } from 'next';
import { events, Event } from '@/app/data/events';

export const metadata: Metadata = {
  title: 'Upcoming Events | Merritt Wellness - Yoga, Sound Baths & Workshops in Denver',
  description: 'Discover upcoming wellness events at Merritt Wellness in Denver\'s Sloans Lake. Join us for sound baths, yoga workshops, breathwork sessions, meditation circles, and more in our historic 1905 sanctuary.',
  keywords: 'wellness events Denver, sound bath events, yoga workshop Denver, meditation event Denver, breathwork Denver, wellness workshop Sloans Lake, spiritual events Denver, healing events Denver',
  openGraph: {
    title: 'Upcoming Events | Merritt Wellness',
    description: 'Join us for transformative wellness events at our historic 1905 venue in Denver. Sound baths, yoga workshops, breathwork, and more.',
    url: 'https://merrittwellness.net/events',
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
    title: 'Upcoming Events | Merritt Wellness Denver',
    description: 'Transformative wellness events at our historic 1905 venue. Sound baths, yoga workshops, breathwork, and more.',
    images: ['https://merrittwellness.net/images/hero/1.webp'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/events',
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

// Keep events whose final relevant date is today or later (recurring series always kept).
function isUpcoming(event: Event): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (event.recurrence) return true;
  const last = event.endDate || event.date;
  return new Date(`${last}T23:59:59`) >= today;
}

function buildEventSchema(event: Event) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: toIsoDateTime(event.date, event.time),
    image: [absoluteImage(event.imageUrl)],
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: 'Merritt Wellness',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '2246 Irving St',
        addressLocality: 'Denver',
        addressRegion: 'CO',
        postalCode: '80211',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Merritt Wellness',
      url: BASE_URL,
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

  if (event.ticketUrl) {
    schema.offers = {
      '@type': 'Offer',
      url: event.ticketUrl,
      availability: 'https://schema.org/InStock',
    };
  } else {
    schema.isAccessibleForFree = true;
  }

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
