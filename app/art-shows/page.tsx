import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PricingBlock from '@/components/venue/PricingBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import FAQSection, { Faq } from '@/components/venue/FAQSection';
import GalleryGrid from '@/components/venue/GalleryGrid';
import InquirySection from '@/components/venue/InquirySection';
import TourCTA from '@/components/venue/TourCTA';
import { VENUE, SPECS } from '@/app/data/venue';

const SHARE_IMAGE = `${VENUE.url}/images/events/art/Karen-1.webp`;

export const metadata: Metadata = {
  title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
  description:
    'Hang a show in a restored 1905 church in Denver\'s Sloans Lake: gallery-style walls, track lighting, and an opening-night room your guests will remember. Up to 125 guests, hourly rates published.',
  keywords:
    'art show venue Denver, gallery space rental Denver, pop-up gallery Denver, art exhibition venue Denver, art opening venue Sloans Lake, makers market venue Denver',
  alternates: { canonical: `${VENUE.url}/art-shows` },
  openGraph: {
    title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
    description:
      'Gallery walls and track lighting inside a restored 1905 church. Openings, exhibitions, and markets in Sloans Lake, Denver.',
    url: `${VENUE.url}/art-shows`,
    siteName: 'Merritt Wellness',
    images: [{ url: SHARE_IMAGE, width: 1920, height: 1440, alt: 'Paintings hung on the wood-framed gallery wall of the main hall at Merritt Wellness' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
    description: 'A restored 1905 church in Sloans Lake with gallery walls and track lighting.',
    images: [SHARE_IMAGE],
  },
};

const venueSchema = {
  '@context': 'https://schema.org',
  '@type': 'EventVenue',
  '@id': `${VENUE.url}/art-shows#venue`,
  name: 'Merritt Wellness',
  description:
    'Art show and exhibition venue in a restored 1905 Denver church with gallery-style display walls, track lighting, and capacity for 125 guests.',
  url: `${VENUE.url}/art-shows`,
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
  image: [SHARE_IMAGE, `${VENUE.url}/images/events/art/Karen-3.webp`],
};

const FAQS: Faq[] = [
  {
    question: 'Where does the work hang?',
    answer:
      'The main hall\'s wood-framed divider walls act as gallery panels under track lighting, and the surrounding brick walls and cafe lounge give you more running feet. Artists label and arrange work however the show calls for.',
  },
  {
    question: 'Can we sell work at the show?',
    answer:
      'Yes, sales of artwork are welcome. The only sales restriction in the building is alcohol, which cannot be sold on premises.',
  },
  {
    question: 'Can we pour wine at the opening?',
    answer:
      'Yes. BYOB is allowed with a certificate of insurance for general liability, and if alcohol is being served it must be poured by a TIPS-certified bartender.',
  },
  {
    question: 'How does lighting work for an evening opening?',
    answer:
      'Track lighting runs the length of the hall and the stained glass does something special at dusk. For projection or video work there is a projector and drop-down screen.',
  },
  {
    question: 'How long can we book?',
    answer:
      'By the hour with a two-hour minimum, and 8 or more hours in one reservation earns an automatic discount. Install and de-install happen within your booked window, and events end by 10 PM.',
  },
  {
    question: 'Is there parking for guests?',
    answer: 'There are 22 on-site spots plus neighborhood street parking.',
  },
];

const GALLERY = [
  {
    src: '/images/events/art/Karen-1.webp',
    alt: 'Abstract paintings hung on the wood-framed gallery wall above the pew benches in the main hall',
  },
  {
    src: '/images/events/art/Karen-2.webp',
    alt: 'A row of canvases displayed on the gallery panels with track lighting overhead',
  },
  {
    src: '/images/events/art/Karen-3.webp',
    alt: 'Circular and rectangular works arranged across the main hall display wall',
  },
  {
    src: '/images/events/art/Karen-4.webp',
    alt: 'Detail of artwork labels and canvases on the wood-and-glass gallery wall',
  },
  {
    src: '/images/events/art/hero.webp',
    alt: 'Wide view of an art show hung in the main hall of the 1905 church',
  },
  {
    src: '/images/events/art/hero-2.webp',
    alt: 'Guests viewing artwork during an exhibition in the main hall',
  },
];

export default function ArtShowsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueSchema) }}
      />
      <main className="bg-[#faf8f5] font-sans">
        <PageHero
          image="/images/events/art/Karen-1.webp"
          imageAlt="Artwork hung on the wood-framed gallery walls of the main hall at Merritt Wellness"
          eyebrow="Art Shows & Exhibitions"
          title={
            <>
              Hang your show in
              <span className="block font-bold">a hundred-year-old room</span>
            </>
          }
          subtitle="Gallery walls, track lighting, and stained glass doing the ambiance for free. Openings, exhibitions, and markets in Sloans Lake."
          primaryCta={{ href: '/booking', label: 'Book your show' }}
          secondaryCta={{ href: '#inquiry', label: 'Ask about a date' }}
        />

        {/* Positioning */}
        <section className="py-16 bg-[#faf8f5]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-xl md:text-2xl text-[#4a3f3c] font-serif font-light leading-relaxed">
              White cubes are neutral; this room is on your side. Work hangs on wood-framed gallery
              panels under track lighting, brick and stained glass frame the conversation, and the
              cafe lounge keeps the wine and the mingling a few steps from the art.
            </p>
          </div>
        </section>

        {/* Gallery */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              Shows that have hung here
            </h2>
            <GalleryGrid
              images={GALLERY}
              placeholders={['Opening night crowd']}
            />
          </div>
        </section>

        <SpecsBlock heading="The space" />

        <PricingBlock
          heading="Exhibition pricing"
          intro="Hourly rates by expected guest count and day of week. Multi-hour installs qualify for the automatic extended-booking discount."
        />

        <PoliciesBlock heading="Show policies" include={['Alcohol', 'End time', 'Setup and breakdown', 'Accessibility']} />

        <FAQSection heading="Questions artists ask" faqs={FAQS} />

        <TourCTA
          heading="Walk the walls first"
          copy="Bring a tape measure and your maquette. Reach out and we will schedule a walkthrough so you can plan the hang."
        />

        <InquirySection eventType="Art show / exhibition" />
      </main>
    </>
  );
}
