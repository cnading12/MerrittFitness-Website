import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getBlurDataURL } from '@/lib/blur-data';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PricingBlock from '@/components/venue/PricingBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import FAQSection, { Faq } from '@/components/venue/FAQSection';
import GalleryGrid from '@/components/venue/GalleryGrid';
import InquirySection from '@/components/venue/InquirySection';
import TourCTA from '@/components/venue/TourCTA';
import { VENUE, SPECS, AMENITIES } from '@/app/data/venue';

const SHARE_IMAGE = `${VENUE.url}/images/events/venue/wedding/10-Celebration - Edited.jpg`;

export const metadata: Metadata = {
  title: 'Denver Wedding Venue in a Restored 1905 Church | Merritt Wellness',
  description:
    'Historic Denver wedding venue in Sloans Lake: a restored 1905 church with 24-foot cathedral ceilings, original stained glass, and hardwood floors. Up to 125 guests, 22 on-site parking spots, transparent hourly pricing. Schedule a tour.',
  keywords:
    'Denver wedding venue, historic wedding venue Denver, church wedding venue Denver, Sloans Lake wedding venue, small wedding venue Denver, intimate wedding venue Colorado, 1905 church wedding',
  alternates: { canonical: `${VENUE.url}/weddings` },
  openGraph: {
    title: 'Denver Wedding Venue in a Restored 1905 Church | Merritt Wellness',
    description:
      'Marry under 24-foot cathedral ceilings and original stained glass in Denver\'s Sloans Lake neighborhood. Up to 125 guests. Real pricing, no "contact for a quote."',
    url: `${VENUE.url}/weddings`,
    siteName: 'Merritt Wellness',
    images: [
      {
        url: SHARE_IMAGE,
        width: 1080,
        height: 649,
        alt: 'A wedding party celebrating beneath the stained glass windows at Merritt Wellness in Denver',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Denver Wedding Venue in a Restored 1905 Church | Merritt Wellness',
    description:
      'Cathedral ceilings, original stained glass, hardwood floors. A Denver wedding venue for up to 125 guests in Sloans Lake.',
    images: [SHARE_IMAGE],
  },
};

// EventVenue structured data for the weddings page. The FAQ section renders
// its own separate FAQPage block.
const venueSchema = {
  '@context': 'https://schema.org',
  '@type': 'EventVenue',
  '@id': `${VENUE.url}/weddings#venue`,
  name: 'Merritt Wellness',
  description:
    'Historic Denver wedding venue: a restored 1905 church in Sloans Lake with 24-foot cathedral ceilings, original stained glass, and hardwood floors for ceremonies and receptions up to 125 guests.',
  url: `${VENUE.url}/weddings`,
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
  geo: {
    '@type': 'GeoCoordinates',
    latitude: VENUE.geo.latitude,
    longitude: VENUE.geo.longitude,
  },
  image: [
    SHARE_IMAGE,
    `${VENUE.url}/images/events/venue/wedding/2-Pose.JPG`,
    `${VENUE.url}/images/events/venue/wedding/7-Wedding.jpg`,
  ],
  amenityFeature: [
    { '@type': 'LocationFeatureSpecification', name: '24-foot cathedral ceilings', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Original stained glass', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'On-site parking (22 spots)', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Surround sound system', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Air conditioning', value: true },
  ],
};

const WEDDING_FAQS: Faq[] = [
  {
    question: 'How many wedding guests can the venue hold?',
    answer:
      'Up to 125 guests. The main hall is about 1,100 square feet under 24-foot ceilings, with another 1,600 square feet upstairs and roughly 2,400 square feet across the full building.',
  },
  {
    question: 'Can we hold both the ceremony and the reception here?',
    answer:
      'Yes. Most couples hold the ceremony in the main hall, move guests to the cafe lounge for cocktails, and flip the hall for the reception. Your rental window covers the whole day, so there is no venue change and no travel between locations.',
  },
  {
    question: 'Are tables and chairs included?',
    answer:
      'Tables and chairs are not included in the rental. Most couples bring in a rental company for reception furniture, and the house set of cafe tables and chairs can be added for a small fee when you book.',
  },
  {
    question: 'Can we serve alcohol?',
    answer:
      'Yes. BYOB is allowed, and any event with alcohol needs a certificate of insurance for general liability. If alcohol is being served, it must be poured by a TIPS-certified bartender, and alcohol cannot be sold on premises.',
  },
  {
    question: 'What time do weddings need to end?',
    answer:
      'Events end by 10 PM. Setup and breakdown happen within your booked rental window, so build both into the hours you reserve.',
  },
  {
    question: 'Is there parking?',
    answer:
      'There are 22 parking spots on site, plus neighborhood street parking in Sloans Lake.',
  },
  {
    question: 'Is the venue wheelchair accessible?',
    answer:
      'There is ramp entry at the front of the building. The main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at Merritt Workspace.',
  },
  {
    question: 'Can we have a live band or DJ?',
    answer:
      'Yes. The building has a surround sound system and the acoustics of a 1905 sanctuary. Bands and DJs are welcome; the on-site mixer is restricted to professional sound techs.',
  },
  {
    question: 'How much decor do we need?',
    answer:
      'Less than you would think. The stained glass, brick, and hardwood floors carry the room, and most couples find a few florals and candles are enough. The space photographs beautifully as it is.',
  },
  {
    question: 'How do we book or hold a date?',
    answer:
      'You can check availability and book directly online, or reach out to schedule a tour first. Call (720) 357-9499 or email manager@merrittwellness.net and we will walk the building together.',
  },
];

const GALLERY = [
  {
    src: '/images/events/venue/wedding/1-Aisle-Walk - Edited.jpg',
    alt: 'Newlyweds walking back up the aisle as guests stand and applaud beneath the stained glass',
  },
  {
    src: '/images/events/venue/wedding/10-Celebration - Edited.jpg',
    alt: 'The couple kissing while the whole wedding party cheers around them in the upstairs hall',
  },
  {
    src: '/images/events/venue/wedding/5-Setup.JPG',
    alt: 'Reception setup with skirted head tables, a wedding cake, and drapery under the wood-framed gallery wall',
  },
  {
    src: '/images/events/venue/wedding/7-Wedding.jpg',
    alt: 'Ceremony seating in white chair covers under the exposed beams of the upstairs hall',
  },
  {
    src: '/images/events/venue/wedding/8-Get-Ready.PNG',
    alt: 'A bride laughing with family while getting ready in the downstairs stone-walled suite',
  },
  {
    src: '/images/hero/Glass-Group.webp',
    alt: 'Four original arched stained glass windows in blue and rose tones along the main hall wall',
  },
];

export default function WeddingsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueSchema) }}
      />
      <main className="bg-[#faf8f5] font-sans">
        <PageHero
          image="/images/events/venue/wedding/2-Pose.JPG"
          imageAlt="A couple sharing a look beside their cake beneath a flower-and-drapery arch in the main hall"
          objectPosition="center 40%"
          eyebrow="Weddings at Merritt Wellness"
          title={
            <>
              A Denver wedding venue
              <span className="block font-bold">inside a 1905 church</span>
            </>
          }
          subtitle="Cathedral ceilings, original stained glass, and hardwood floors in the heart of Sloans Lake. Up to 125 guests."
          primaryCta={{ href: '/booking', label: 'Check your date' }}
          secondaryCta={{ href: '#tour', label: 'Schedule a tour' }}
        />

        {/* Positioning */}
        <section className="py-16 bg-[#faf8f5]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-xl md:text-2xl text-[#4a3f3c] font-serif font-light leading-relaxed">
              Some venues need a truck full of decor to feel special. This one was built in 1905 and
              has spent every year since being exactly what it is: 24-foot cathedral ceilings,
              original stained glass, and warm hardwood floors that photograph beautifully on their
              own. You bring the people; the building does the rest.
            </p>
          </div>
        </section>

        <SpecsBlock heading="The space, by the numbers" />

        {/* Gallery */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              See the space
            </h2>
            <GalleryGrid
              images={GALLERY}
              placeholders={[
                'Dusk exterior',
                'Couple portrait outside the building',
              ]}
            />
            <p className="text-center mt-8">
              <Link
                href="/#gallery"
                className="text-[#735e59] font-semibold underline underline-offset-4 hover:text-[#5a4a46]"
              >
                Browse the full gallery
              </Link>
            </p>
          </div>
        </section>

        {/* What's included */}
        <section className="py-16 bg-[#f2eee9]/60">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              What your rental includes
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'Exclusive use of the main hall for your booked window',
                'Surround sound system and projector',
                'Cafe lounge for cocktails and mingling',
                'Downstairs getting-ready space',
                'Breakout rooms for vendors, kids, or a quiet minute',
                '22 on-site parking spots',
                'Air conditioning',
                'A venue manager to onboard you on arrival',
              ].map((item) => (
                <div key={item} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-[#735e59]/10 text-[#6b5f5b]">
                  {item}
                </div>
              ))}
            </div>
            <p className="text-[#6b5f5b] leading-relaxed mt-8 text-center max-w-2xl mx-auto">
              Tables and chairs are not included; most couples bring in a rental company for
              reception furniture.
            </p>
          </div>
        </section>

        <PricingBlock
          heading="Wedding pricing"
          intro="Real numbers, published. Rates are hourly and depend on guest count and day of the week; most weddings book a Saturday with 8 or more hours, which earns the automatic extended-booking discount."
        />

        {/* Amenities */}
        <section className="py-16 bg-[#f2eee9]/60">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              Amenities
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {AMENITIES.map((amenity) => (
                <span
                  key={amenity}
                  className="bg-white rounded-full px-5 py-2.5 text-[#6b5f5b] shadow-sm border border-[#735e59]/10"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </section>

        <PoliciesBlock heading="Policies, plainly" include={['Alcohol', 'End time', 'Setup and breakdown', 'Accessibility', 'Live sound']} />

        <FAQSection faqs={WEDDING_FAQS} />

        <div id="tour">
          <TourCTA
            heading="Come stand in the room"
            copy="The photos are honest, but the light through the stained glass at golden hour is something you have to see. Reach out and we will find a time to walk the building together."
          />
        </div>

        <InquirySection eventType="Wedding" />
      </main>
    </>
  );
}
