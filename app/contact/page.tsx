import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, Car, Accessibility } from 'lucide-react';
import PageHero from '@/components/venue/PageHero';
import InquiryForm from '@/components/venue/InquiryForm';
import { venueImages } from '@/app/data/venue-images';
import { contact, hours, specs, workspace } from '@/app/data/site';
import {
  BASE_URL,
  BUSINESS_ID,
  postalAddress,
  geoCoordinates,
  breadcrumbJsonLd,
  jsonLdScript,
} from '@/lib/site-schema';

// /contact used to 301 to /book. That redirect is gone: "<business> contact",
// "<business> phone number", and "<business> hours" are high-intent
// navigational queries that a booking wizard cannot answer, and a canonical
// NAP page is the standard on-site support for a Google Business Profile.
//
// Per the owner's request this page is NOT added to the navbar — the footer
// and the homepage contact section link to it, which is enough for both
// crawlers and people who go looking for it.
const PATH = '/contact';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/venue/exterior-front.webp';

export const metadata: Metadata = {
  title: "Contact Merritt Wellness | Denver Event Venue in Sloans Lake",
  description: `Contact Merritt Wellness at ${contact.inquiries.phone} or ${contact.inquiries.email}. Historic 1905 event and class venue at ${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}, open ${hours.display}, with ${specs.parkingSpots} on-site parking spots. Tours by appointment.`,
  keywords:
    "Merritt Wellness contact, Merritt Wellness phone number, Merritt Wellness Denver address, event venue Sloans Lake contact, book a venue tour Denver",
  openGraph: {
    title: "Contact Merritt Wellness | Denver Event Venue in Sloans Lake",
    description: `Call ${contact.inquiries.phone}, email ${contact.inquiries.email}, or book a tour of the historic 1905 sanctuary at ${contact.address.street}.`,
    url: `${BASE_URL}${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 2048, height: 1142, alt: venueImages.exteriorFront.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Merritt Wellness | Denver Event Venue',
    description: `Call ${contact.inquiries.phone}, email ${contact.inquiries.email}, or book a tour of the historic 1905 sanctuary.`,
    images: [OG_IMAGE],
  },
  alternates: { canonical: `${BASE_URL}${PATH}` },
};

const mapsQuery = encodeURIComponent(
  `${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}`
);

function contactPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${BASE_URL}${PATH}#contactpage`,
    url: `${BASE_URL}${PATH}`,
    name: 'Contact Merritt Wellness',
    description: `How to reach Merritt Wellness, a historic 1905 event and class venue in Denver's ${contact.address.neighborhood} neighborhood.`,
    about: { '@id': BUSINESS_ID },
    mainEntity: {
      '@id': BUSINESS_ID,
      '@type': 'LocalBusiness',
      name: 'Merritt Wellness',
      address: postalAddress,
      geo: geoCoordinates,
      telephone: contact.inquiries.phoneE164,
      email: contact.inquiries.email,
      // Two contact points, because the venue genuinely routes them
      // differently: new business goes to the manager line, booked clients go
      // to client services. Saying so in the markup keeps assistants from
      // handing a prospective renter the wrong number.
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'sales',
          name: 'New events, tours, and bookings',
          telephone: contact.inquiries.phoneE164,
          email: contact.inquiries.email,
          areaServed: 'US',
          availableLanguage: ['English'],
        },
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          name: 'Client services (existing bookings)',
          telephone: `+1-${contact.clientServices.phoneHref.replace('tel:', '')}`,
          email: contact.clientServices.email,
          areaServed: 'US',
          availableLanguage: ['English'],
        },
      ],
    },
  };
}

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(contactPageJsonLd())}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(PATH, [{ name: 'Contact' }]))}
      />

      <main className="bg-[#faf8f5] font-sans">
        <PageHero
          image={{ src: venueImages.exteriorFront.src, alt: venueImages.exteriorFront.alt }}
          eyebrow={`${contact.address.neighborhood}, Denver`}
          title={
            <>
              Come See
              <span className="block font-bold">the Room</span>
            </>
          }
          subtitle="Call, email, or send a note below. We answer personally, usually within one business day, and tours are free and take about twenty minutes."
          ctas={[
            { label: `Call ${contact.inquiries.phone}`, href: contact.inquiries.phoneHref },
            { label: 'Check Availability', href: '/book', variant: 'ghost' },
          ]}
        />

        {/* NAP block. This is the canonical on-site copy of the venue's name,
            address, and phone; it must match the Google Business Profile
            character for character, so every value here reads from
            app/data/site.ts rather than being typed inline. */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">
              Merritt Wellness
              <span className="block font-bold text-[#735e59]">at a glance</span>
            </h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-[#735e59] to-transparent mb-12" />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-5">
                  <MapPin className="w-6 h-6 text-[#735e59]" />
                </div>
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-3">Address</h3>
                <address className="not-italic text-[#6b5f5b] leading-relaxed">
                  {contact.address.street}
                  <br />
                  {contact.address.city}, {contact.address.state} {contact.address.zip}
                  <br />
                  <span className="text-sm text-[#a08b84]">
                    {contact.address.neighborhood} neighborhood
                  </span>
                </address>
                <a
                  href={`https://maps.google.com/?q=${mapsQuery}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-block mt-4 text-sm font-semibold text-[#735e59] underline decoration-[#735e59]/30 underline-offset-4 hover:decoration-[#735e59]"
                >
                  Open in Google Maps
                </a>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-5">
                  <Phone className="w-6 h-6 text-[#735e59]" />
                </div>
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-3">
                  New events &amp; tours
                </h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  <a href={contact.inquiries.phoneHref} className="hover:text-[#735e59]">
                    {contact.inquiries.phone}
                  </a>
                  <br />
                  <a
                    href={`mailto:${contact.inquiries.email}`}
                    className="hover:text-[#735e59] break-all"
                  >
                    {contact.inquiries.email}
                  </a>
                </p>
                <p className="mt-4 text-sm text-[#a08b84] leading-relaxed">
                  Every new inquiry — a wedding, a weekly class block, a tour — starts here.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-5">
                  <Mail className="w-6 h-6 text-[#735e59]" />
                </div>
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-3">
                  Already booked with us
                </h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  <a href={contact.clientServices.phoneHref} className="hover:text-[#735e59]">
                    {contact.clientServices.phone}
                  </a>
                  <br />
                  <a
                    href={`mailto:${contact.clientServices.email}`}
                    className="hover:text-[#735e59] break-all"
                  >
                    {contact.clientServices.email}
                  </a>
                </p>
                <p className="mt-4 text-sm text-[#a08b84] leading-relaxed">
                  Client services handles invoices, schedule changes, and day-of logistics for
                  events already on the calendar.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-5">
                  <Clock className="w-6 h-6 text-[#735e59]" />
                </div>
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-3">Hours</h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  Bookable {hours.display}.
                </p>
                <p className="mt-4 text-sm text-[#a08b84] leading-relaxed">
                  Events end by 10 PM in line with Denver neighborhood ordinances. Tours are by
                  appointment, so call ahead rather than dropping in.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-5">
                  <Car className="w-6 h-6 text-[#735e59]" />
                </div>
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-3">
                  Parking &amp; getting here
                </h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  {specs.parkingSpots} on-site parking spots, plus street parking on the
                  surrounding blocks.
                </p>
                <p className="mt-4 text-sm text-[#a08b84] leading-relaxed">
                  A few minutes from I-25 and Federal Boulevard, walking distance from Sloan&apos;s
                  Lake, and a short ride from Highland, Berkeley, West Colfax, Jefferson Park,
                  and Edgewater.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-5">
                  <Accessibility className="w-6 h-6 text-[#735e59]" />
                </div>
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-3">Accessibility</h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  The front entrance has ramp access into the main hall.
                </p>
                <p className="mt-4 text-sm text-[#a08b84] leading-relaxed">
                  Main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are
                  available next door at{' '}
                  <a
                    href={workspace.url}
                    target="_blank"
                    rel="noopener"
                    className="text-[#735e59] underline decoration-[#735e59]/30 underline-offset-2 hover:decoration-[#735e59]"
                  >
                    {workspace.name}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="aspect-[16/9] rounded-3xl overflow-hidden shadow-xl border border-[#735e59]/10">
              <iframe
                src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map to Merritt Wellness, ${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}`}
              />
            </div>
          </div>
        </section>

        {/* Inquiry form. `kind: 'tour'` is the closest existing category in
            the /api/inquiry schema for a general enquiry — do not invent a new
            kind here without updating that route and its tests. */}
        <section className="pb-24">
          <div className="max-w-3xl mx-auto px-6">
            <InquiryForm
              kind="tour"
              page={PATH}
              heading="Send Us a Note"
              subheading="Tell us roughly what you have in mind and we will come back with availability, a real price, and a time to walk the room."
              showEventFields
              submitLabel="Send Message"
            />
          </div>
        </section>

        {/* Where to go next, so this page passes authority on rather than
            dead-ending. */}
        <section className="pb-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-[#6b5f5b] leading-relaxed">
              Looking for something specific? See{' '}
              <Link href="/weddings" className="text-[#735e59] font-semibold hover:underline">
                weddings
              </Link>
              ,{' '}
              <Link
                href="/class-partnerships"
                className="text-[#735e59] font-semibold hover:underline"
              >
                wellness &amp; movement classes
              </Link>
              ,{' '}
              <Link href="/private-events" className="text-[#735e59] font-semibold hover:underline">
                private events
              </Link>
              ,{' '}
              <Link href="/recurring" className="text-[#735e59] font-semibold hover:underline">
                recurring booking rates
              </Link>
              , or{' '}
              <Link href="/calendar" className="text-[#735e59] font-semibold hover:underline">
                what&apos;s on this month
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
