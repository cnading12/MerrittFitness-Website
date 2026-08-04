import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PricingBlock from '@/components/venue/PricingBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import FAQSection, { Faq } from '@/components/venue/FAQSection';
import GalleryGrid from '@/components/venue/GalleryGrid';
import InquirySection from '@/components/venue/InquirySection';
import { VENUE, SPECS } from '@/app/data/venue';

const SHARE_IMAGE = `${VENUE.url}/images/events/venue/concerts/1-Western-Wish.JPEG`;

export const metadata: Metadata = {
  title: 'Concert & Performance Venue in Denver | Merritt Wellness',
  description:
    'An intimate Denver listening room in a restored 1905 church: natural sanctuary acoustics, surround sound, projector, and room for up to 125 guests. Sloans Lake, 22 on-site parking spots. Book by the hour.',
  keywords:
    'small concert venue Denver, intimate music venue Denver, listening room Denver, performance space rental Denver, recital venue Denver, sound bath venue Denver, Sloans Lake music venue',
  alternates: { canonical: `${VENUE.url}/concerts` },
  openGraph: {
    title: 'Concert & Performance Venue in Denver | Merritt Wellness',
    description:
      'Play a room built for sound: a 1905 sanctuary with cathedral acoustics, surround sound, and an audience of up to 125.',
    url: `${VENUE.url}/concerts`,
    siteName: 'Merritt Wellness',
    images: [{ url: SHARE_IMAGE, width: 4000, height: 3000, alt: 'Songwriters performing beneath the rose window at Merritt Wellness in Denver' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concert & Performance Venue in Denver | Merritt Wellness',
    description: 'A 1905 sanctuary turned intimate listening room in Sloans Lake, Denver.',
    images: [SHARE_IMAGE],
  },
};

const venueSchema = {
  '@context': 'https://schema.org',
  '@type': 'EventVenue',
  '@id': `${VENUE.url}/concerts#venue`,
  name: 'Merritt Wellness',
  description:
    'Intimate concert and performance venue in a restored 1905 Denver church: natural sanctuary acoustics, surround sound system, and capacity for 125.',
  url: `${VENUE.url}/concerts`,
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
  image: [SHARE_IMAGE, `${VENUE.url}/images/events/venue/concerts/2-PS.jpeg`],
};

const FAQS: Faq[] = [
  {
    question: 'What is the audience capacity?',
    answer:
      'Up to 125 people. Seated rows, cabaret tables, or standing room all work in the roughly 1,100 square foot main hall; pew benches along the walls come with the room.',
  },
  {
    question: 'What sound equipment is in the building?',
    answer:
      'A surround sound system and a projector with a drop-down screen above the stage wall. The on-site mixer is restricted to professional sound techs, so bring your engineer or ask us about local recommendations.',
  },
  {
    question: 'How are the acoustics?',
    answer:
      'It is a 1905 sanctuary with 24-foot ceilings: warm, live, and generous to acoustic instruments and voices. Sound baths, choirs, strings, and singer-songwriters sound the way the builders intended.',
  },
  {
    question: 'Can we sell tickets?',
    answer:
      'Yes, ticketed shows are welcome. Note that alcohol cannot be sold on premises; BYOB is allowed with a certificate of insurance and a TIPS-certified bartender if alcohol is being served.',
  },
  {
    question: 'When do shows need to end?',
    answer:
      'Events end by 10 PM, and load-in, soundcheck, and load-out all happen inside your booked window, so book the hours to cover them.',
  },
  {
    question: 'Is there parking for the audience?',
    answer: 'There are 22 on-site parking spots plus street parking in the surrounding Sloans Lake blocks.',
  },
];

const GALLERY = [
  {
    src: '/images/hero/Sound-event.JPG',
    alt: 'Evening sound bath in the main hall with a gong, candles, and colored light washing the vaulted ceiling',
  },
  {
    src: '/images/hero/Sound-Event2.JPG',
    alt: 'Sound healing setup with bowls and instruments arranged beneath the stained glass',
  },
  {
    src: '/images/hero/church-1.webp',
    alt: 'Main hall with the rose window, four stained glass windows, and open hardwood floor ready for seating',
  },
  {
    src: '/images/hero/candles.webp',
    alt: 'Candlelight against the dark wood floor during an evening performance',
  },
  {
    src: '/images/events/venue/concerts/2-PS.jpeg',
    alt: 'A packed dance floor moving together during an evening show in the main hall',
  },
];

export default function ConcertsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueSchema) }}
      />
      <main className="bg-[#faf8f5] font-sans">
        <PageHero
          image="/images/events/venue/concerts/1-Western-Wish.JPEG"
          imageAlt="Four songwriters performing in the round beneath the rose window as the audience listens"
          eyebrow="Concerts & Performances"
          title={
            <>
              A room that was built
              <span className="block font-bold">to carry sound</span>
            </>
          }
          subtitle="Sanctuary acoustics, 24-foot ceilings, and an audience close enough to hear you breathe. An intimate Denver listening room for up to 125."
          primaryCta={{ href: '/booking', label: 'Book a date' }}
          secondaryCta={{ href: '#inquiry', label: 'Ask about your show' }}
        />

        {/* Positioning */}
        <section className="py-16 bg-[#faf8f5]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-xl md:text-2xl text-[#4a3f3c] font-serif font-light leading-relaxed">
              Churches were the original concert halls, and this one still does its job. Acoustic
              sets, album releases, chamber music, choirs, sound baths, and listening parties all
              land differently under a vaulted ceiling. The room seats an audience that came to
              actually listen.
            </p>
          </div>
        </section>

        <SpecsBlock
          heading="The room"
          items={[
            { value: '125', label: 'Audience capacity' },
            { value: '24 ft', label: 'Ceilings' },
            { value: '1,100', label: 'Sq ft main hall' },
            { value: '22', label: 'On-site parking spots' },
          ]}
        />

        {/* Gallery */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              The hall in performance
            </h2>
            <GalleryGrid images={GALLERY} />
          </div>
        </section>

        <PricingBlock
          heading="Performance pricing"
          intro="Hourly rates by audience size and day of week. Book enough hours to cover load-in, soundcheck, and load-out; 8 or more hours triggers the automatic discount."
        />

        <PoliciesBlock heading="Show policies" include={['Live sound', 'Alcohol', 'End time', 'Setup and breakdown', 'Accessibility']} />

        <FAQSection heading="Questions performers ask" faqs={FAQS} />

        <InquirySection
          eventType="Concert / performance"
          intro="Tell us about the show: the act, the audience size, the date you are eyeing. Or come clap in the room first and hear the hall for yourself."
          tourInvite
        />
      </main>
    </>
  );
}
