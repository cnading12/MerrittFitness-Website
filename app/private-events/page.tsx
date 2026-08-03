import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PricingBlock from '@/components/venue/PricingBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import FAQSection, { Faq } from '@/components/venue/FAQSection';
import InquirySection from '@/components/venue/InquirySection';
import TourCTA from '@/components/venue/TourCTA';
import { VENUE, SPECS, AMENITIES } from '@/app/data/venue';
import { EVENT_TYPES } from '@/app/data/private-events';

const SHARE_IMAGE = `${VENUE.url}/images/hero/church-3.webp`;

export const metadata: Metadata = {
  title: 'Private Event Venue in Denver | Restored 1905 Church | Merritt Wellness',
  description:
    'Rent a restored 1905 church in Denver\'s Sloans Lake for private events: celebrations of life, quinceañeras, birthdays, showers, graduations, corporate offsites, and more. Up to 125 guests, published hourly pricing, 22 parking spots.',
  keywords:
    'private event venue Denver, event space rental Denver, celebration of life venue Denver, quinceañera venue Denver, corporate offsite Denver, party venue Sloans Lake, historic event venue Denver',
  alternates: { canonical: `${VENUE.url}/private-events` },
  openGraph: {
    title: 'Private Event Venue in Denver | Merritt Wellness',
    description:
      'A restored 1905 church in Sloans Lake for gatherings of every kind, up to 125 guests. Real pricing, published.',
    url: `${VENUE.url}/private-events`,
    siteName: 'Merritt Wellness',
    images: [{ url: SHARE_IMAGE, width: 1080, height: 1440, alt: 'Main hall of the restored 1905 church at Merritt Wellness in Denver' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Private Event Venue in Denver | Merritt Wellness',
    description: 'A restored 1905 church in Sloans Lake for private events up to 125 guests.',
    images: [SHARE_IMAGE],
  },
};

const venueSchema = {
  '@context': 'https://schema.org',
  '@type': 'EventVenue',
  '@id': `${VENUE.url}/private-events#venue`,
  name: 'Merritt Wellness',
  description:
    'Restored 1905 church in Denver\'s Sloans Lake neighborhood, available for private events up to 125 guests: weddings, concerts, art shows, celebrations of life, quinceañeras, birthdays, showers, graduations, and corporate offsites.',
  url: `${VENUE.url}/private-events`,
  telephone: VENUE.phoneIntl,
  email: VENUE.email,
  maximumAttendeeCapacity: SPECS.capacity,
  address: {
    '@type': 'PostalAddress',
    streetAddress: VENUE.address.street,
    addressLocality: VENUE.address.city,
    addressRegion: VENUE.address.state,
    postalCode: VENUE.address.zip,
    addressCountry: 'US',
  },
  geo: { '@type': 'GeoCoordinates', latitude: VENUE.geo.latitude, longitude: VENUE.geo.longitude },
  image: [SHARE_IMAGE, `${VENUE.url}/images/hero/1.webp`],
};

const FAQS: Faq[] = [
  {
    question: 'What kinds of private events does the venue host?',
    answer:
      'Weddings, concerts and performances, art shows, celebrations of life and memorials, quinceañeras, birthday parties, baby and bridal showers, graduation parties, and corporate offsites. If people are gathering, the building probably suits it.',
  },
  {
    question: 'How many guests can the building hold?',
    answer:
      'Up to 125 guests, with about 1,100 square feet in the main hall, 1,600 square feet upstairs, and roughly 2,400 square feet across the full building.',
  },
  {
    question: 'Is there a minimum rental?',
    answer:
      'Two hours. Your rental window includes your own setup and breakdown time, and events end by 10 PM.',
  },
  {
    question: 'Can we bring our own caterer and alcohol?',
    answer:
      'Yes to both. Outside caterers are welcome. BYOB is allowed; any event with alcohol needs a general liability certificate of insurance, served alcohol requires a TIPS-certified bartender, and alcohol cannot be sold on premises.',
  },
  {
    question: 'How do I see the space or hold a date?',
    answer:
      'Book directly online if you know your date, or call (720) 357-9499 or email manager@merrittwellness.net to schedule a tour.',
  },
];

export default function PrivateEventsPage() {
  const withPages = EVENT_TYPES.filter((t) => t.href);
  const inProse = EVENT_TYPES.filter((t) => !t.href);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueSchema) }}
      />
      <main className="bg-[#faf8f5] font-sans">
        <PageHero
          image="/images/hero/church-3.webp"
          imageAlt="Main hall of the 1905 church with cathedral ceilings, rose window, and hardwood floors, set for an event"
          eyebrow="Private Events"
          title={
            <>
              One building,
              <span className="block font-bold">every kind of gathering</span>
            </>
          }
          subtitle="A restored 1905 church in Sloans Lake for up to 125 guests. Weddings, concerts, memorials, milestones, and everything between."
          primaryCta={{ href: '/booking', label: 'Check availability' }}
          secondaryCta={{ href: '#inquiry', label: 'Send an inquiry' }}
        />

        {/* Event types with dedicated pages */}
        <section className="py-16 bg-[#faf8f5]">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              Planning one of these?
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {withPages.map((type) => (
                <Link
                  key={type.slug}
                  href={type.href!}
                  className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#735e59]/10 hover:-translate-y-1"
                >
                  <h3 className="text-xl font-bold text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif mb-3">
                    {type.name}
                  </h3>
                  <p className="text-[#6b5f5b] text-sm leading-relaxed mb-4">{type.description}</p>
                  <span className="text-[#735e59] font-semibold text-sm">
                    See the {type.name.toLowerCase().split(' ')[0]} page →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Event types covered here until they earn their own pages */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-4">
              And everything else people gather for
            </h2>
            <p className="text-[#6b5f5b] text-center max-w-2xl mx-auto mb-10 leading-relaxed">
              The building has spent 120 years holding services, suppers, recitals, and receptions.
              These days that list looks like this.
            </p>
            <div className="space-y-6">
              {inProse.map((type) => (
                <div key={type.slug} className="bg-[#faf8f5] rounded-2xl p-6 border border-[#735e59]/10">
                  <h3 className="font-bold text-[#4a3f3c] font-serif text-lg mb-2">{type.name}</h3>
                  <p className="text-[#6b5f5b] leading-relaxed">{type.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SpecsBlock heading="Capacity and specs" />

        {/* Amenities */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              Amenities
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {AMENITIES.map((amenity) => (
                <span
                  key={amenity}
                  className="bg-[#faf8f5] rounded-full px-5 py-2.5 text-[#6b5f5b] shadow-sm border border-[#735e59]/10"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </section>

        <PricingBlock
          heading="Pricing, in full"
          intro="Every rate we charge is on this table or the list under it. Rates are hourly, set by guest count and day of the week."
          showRecurring={false}
        />

        <PoliciesBlock heading="Policies" include={['Alcohol', 'End time', 'Setup and breakdown', 'Accessibility', 'Live sound']} />

        <FAQSection heading="Common questions" faqs={FAQS} />

        <TourCTA />

        <InquirySection eventType="Private event" />
      </main>
    </>
  );
}
