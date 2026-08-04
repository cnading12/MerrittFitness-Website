import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import FAQSection, { Faq } from '@/components/venue/FAQSection';
import GalleryGrid from '@/components/venue/GalleryGrid';
import InquirySection from '@/components/venue/InquirySection';
import { VENUE, SPECS, buildPricing } from '@/app/data/venue';
import { SUNDAY_SCHEDULE } from '@/app/data/partnerships';

const SHARE_IMAGE = `${VENUE.url}/images/events/venue/church/church-1.jpg`;

export const metadata: Metadata = {
  title: 'A Home for Your Congregation in Denver | Merritt Wellness',
  description:
    'A restored 1905 church in Denver\'s Sloans Lake, home to two congregations and open to more. Non-denominational, welcoming every tradition. Flat monthly partnerships, sound system and projector installed, 22 parking spots. Sunday evenings open.',
  keywords:
    'church space for rent Denver, congregation space Denver, worship space rental Denver, church building share Denver, interfaith gathering space Denver, meditation group space Denver',
  alternates: { canonical: `${VENUE.url}/congregations` },
  openGraph: {
    title: 'A Home for Your Congregation in Denver | Merritt Wellness',
    description:
      'A 1905 church, restored and still gathering people every week. Two congregations meet here now; there is room for more.',
    url: `${VENUE.url}/congregations`,
    siteName: 'Merritt Wellness',
    images: [{ url: SHARE_IMAGE, width: 3024, height: 4032, alt: 'The sanctuary of the 1905 church with its rose window and stained glass' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Home for Your Congregation in Denver | Merritt Wellness',
    description: 'A restored 1905 Denver church with room for another Sunday community.',
    images: [SHARE_IMAGE],
  },
};

const venueSchema = {
  '@context': 'https://schema.org',
  '@type': 'EventVenue',
  '@id': `${VENUE.url}/congregations#venue`,
  name: 'Merritt Wellness',
  description:
    'Restored 1905 church in Denver\'s Sloans Lake neighborhood offering recurring space to congregations and spiritual communities of every tradition. Two churches currently hold Sunday services here.',
  url: `${VENUE.url}/congregations`,
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
  image: [SHARE_IMAGE, `${VENUE.url}/images/hero/Glass-Group.webp`],
};

const FAQS: Faq[] = [
  {
    question: 'Is the space only for Christian churches?',
    answer:
      'No. The building was a Methodist church for 120 years and operates today as a non-denominational venue. Interfaith groups, meditation and contemplative practice, grief and recovery circles, and cultural and spiritual communities of any tradition are welcome here.',
  },
  {
    question: 'Who meets here now?',
    answer:
      'Two churches hold Sunday services in the building, between 7 AM and 4:30 PM. Communities considering the space are welcome to visit on a Sunday and see how the building runs.',
  },
  {
    question: 'What times are available?',
    answer:
      'Sunday evenings from 4:30 PM are open, and there is remaining capacity within the Sunday daytime window. Weekday and weeknight recurring slots are also possible; bring us your schedule and we will look at it together.',
  },
  {
    question: 'How is a partnership priced?',
    answer:
      'As a flat monthly rate based on your schedule, rather than an hourly meter. Non-profits automatically qualify for the 20% partner discount with no minimum hours.',
  },
  {
    question: 'What equipment is available for services?',
    answer:
      'A surround sound system, projector, and screen are already installed. Microphones, music, and slides all work without bringing in your own gear; the on-site mixer is operated by professional sound techs.',
  },
  {
    question: 'Is the building accessible?',
    answer:
      'There is ramp entry at the front. The main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at Merritt Workspace.',
  },
  {
    question: 'Can we store anything between services?',
    answer:
      'Talk to us about what you carry week to week. Storage depends on what other communities in the building need, so it is part of the fit conversation.',
  },
];

const GALLERY = [
  {
    src: '/images/events/venue/church/church-2.jpg',
    alt: 'The warm main hall of the sanctuary with hardwood floors and stained glass along the wall',
  },
  {
    src: '/images/hero/Glass-Group.webp',
    alt: 'Original stained glass windows glowing along the sanctuary wall',
  },
  {
    src: '/images/events/community/group.webp',
    alt: 'A community gathered in rows during a service in the main hall',
  },
  {
    src: '/images/events/venue/church/outside-2.jpg',
    alt: 'The brick church on its corner lot under summer trees, seen from the sidewalk',
  },
  {
    src: '/images/hero/Cafe-East.webp',
    alt: 'The cafe lounge with tables and pews, used for fellowship after services',
  },
  {
    src: '/images/events/venue/church/community.JPG',
    alt: 'A weeknight community meeting seated in rows in the upstairs hall',
  },
];

export default function CongregationsPage() {
  const pricing = buildPricing();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueSchema) }}
      />
      <main className="bg-[#faf8f5] font-sans">
        <PageHero
          image="/images/events/venue/church/church-1.jpg"
          imageAlt="The sanctuary of the restored 1905 church, rose window above and morning light on the hardwood floor"
          eyebrow="Congregation Partnerships"
          title={
            <>
              This building has held
              <span className="block font-bold">Sundays since 1905</span>
            </>
          }
          subtitle="A restored church in Sloans Lake, home to two congregations today, with room for more."
          primaryCta={{ href: '#inquiry', label: 'Start a conversation' }}
        />

        {/* The framing: history and openness, held together */}
        <section className="py-16 bg-[#faf8f5]">
          <div className="max-w-3xl mx-auto px-6 space-y-6 text-lg text-[#4a3f3c] leading-relaxed">
            <p className="text-xl md:text-2xl font-serif font-light">
              For 120 years this was a Methodist church. People were married here, mourned here,
              sang here, and sat quietly here, and all of that is still in the room. It is the
              reason the building feels the way it does.
            </p>
            <p>
              Today Merritt Wellness operates the building as a non-denominational venue, and it
              turns out a space shaped by a century of gathering serves many kinds of gathering
              well. Two churches hold their Sunday services here now. Alongside them, the building
              welcomes interfaith groups, meditation and contemplative practice, grief and recovery
              circles, and cultural and spiritual communities of any tradition. If your community
              gathers in a supportive or meaningful way, this space is for you.
            </p>
            <p>
              We know that a community looking for a room is often in a hard season: a lease
              ending, a building sold, a congregation between homes. There is no pitch here. Come
              see the space, tell us what your community needs, and we will be straight with you
              about whether this building can be that home.
            </p>
          </div>
        </section>

        {/* Sunday schedule — data-driven, edit app/data/partnerships.ts */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              Sundays right now
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#faf8f5] rounded-2xl p-6 border border-[#735e59]/15">
                <div className="text-sm uppercase tracking-wide text-[#a08b84] mb-1">Daytime</div>
                <div className="font-bold text-[#4a3f3c] font-serif text-lg mb-2">
                  {SUNDAY_SCHEDULE.occupiedWindow}
                </div>
                <p className="text-[#6b5f5b] text-sm leading-relaxed">{SUNDAY_SCHEDULE.note}</p>
              </div>
              <div className="bg-[#faf8f5] rounded-2xl p-6 border border-[#735e59]/15">
                <div className="text-sm uppercase tracking-wide text-[#a08b84] mb-1">Evening</div>
                <div className="font-bold text-[#4a3f3c] font-serif text-lg mb-2">
                  Open after {SUNDAY_SCHEDULE.eveningAvailableFrom}
                </div>
                <p className="text-[#6b5f5b] text-sm leading-relaxed">
                  Sunday evenings are available for a recurring service, circle, or practice.
                  Weekday evenings can work too.
                </p>
              </div>
            </div>
            <p className="text-[#6b5f5b] text-center text-sm">
              Knowing who else is in the building matters when you are choosing a home. Visit on a
              Sunday and you will see it in use.
            </p>
          </div>
        </section>

        {/* The building */}
        <section className="py-16 bg-[#f2eee9]/60">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              The building
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'Constructed in 1905 as a Methodist church, restored, and in continuous use as a gathering space',
                `Sanctuary seating for up to ${SPECS.capacity}, under ${SPECS.ceilingFeet}-foot cathedral ceilings`,
                'Original stained glass and hardwood floors',
                'Surround sound system, projector, and screen already installed',
                `${SPECS.parkingSpots} on-site parking spots`,
                'Cafe lounge for coffee and fellowship after the service',
                'Ramp entry at the front; main hall restrooms are downstairs and are not ADA accessible, with ADA restrooms next door at Merritt Workspace',
              ].map((item) => (
                <div key={item} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-[#735e59]/10 text-[#6b5f5b] leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
              The sanctuary
            </h2>
            <GalleryGrid images={GALLERY} />
          </div>
        </section>

        {/* Partnership pricing */}
        <section className="py-16 bg-[#f2eee9]/60">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-6">
              How partnerships work
            </h2>
            <p className="text-[#6b5f5b] leading-relaxed mb-4">
              Congregation partnerships are structured as a flat monthly rate based on your
              schedule, not an hourly meter running during the service. You know what the month
              costs before it starts.
            </p>
            <p className="text-[#6b5f5b] leading-relaxed">
              Non-profit communities automatically qualify for the partner discount of{' '}
              {pricing.recurring.pct}% off the underlying rates, with no minimum hours; as a point
              of reference, {pricing.recurring.exampleWeekday} before it rolls up into your monthly
              amount. Bring us your schedule and we will put a real number on it.
            </p>
          </div>
        </section>

        <FAQSection heading="Questions communities ask" faqs={FAQS} />

        <InquirySection
          eventType="Congregation partnership"
          heading="Talk through the fit"
          intro="Tell us about your community, your schedule, and what you need from a building. We will set up a walkthrough and take it from there."
          tourInvite
        />
      </main>
    </>
  );
}
