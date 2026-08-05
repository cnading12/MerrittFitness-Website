import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import RateTable from '@/components/venue/RateTable';
import Gallery from '@/components/venue/Gallery';
import FaqSection from '@/components/venue/FaqSection';
import InquiryForm from '@/components/venue/InquiryForm';
import CoPromotionBlock from '@/components/venue/CoPromotionBlock';
import { venueJsonLd, faqJsonLd, type Faq } from '@/lib/venue-schema';
import { venueImages, concertsImages } from '@/app/data/venue-images';
import { mixerPolicy } from '@/app/data/site';
import { extendedDiscount } from '@/app/lib/venue-rates';

const PATH = '/concerts';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/concerts/songwriters-round.webp';

export const metadata: Metadata = {
  title: 'Concert & Performance Venue in Denver | Merritt Wellness',
  description:
    'Host concerts, recitals, album releases, and performances in a restored 1905 Denver church with a built-in surround sound system, 24-foot ceilings, and room for 125 guests. Sloans Lake, with 22 parking spots.',
  keywords:
    'small concert venue Denver, performance space Denver, recital venue Denver, album release venue Denver, live music venue rental Denver, intimate concert venue Colorado',
  openGraph: {
    title: 'Concert & Performance Venue in Denver | Merritt Wellness',
    description:
      'A 1905 church hall built for sound: surround system, cathedral acoustics, and an audience of up to 125.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 2400, height: 1800, alt: concertsImages.songwritersRound.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concert & Performance Venue in Denver',
    description:
      'A 1905 church hall built for sound: surround system, cathedral acoustics, and an audience of up to 125.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

const faqs: Faq[] = [
  {
    question: 'What sound equipment is in the room?',
    answer:
      'A surround sound system is built in, along with a projector and screen. The on-site mixer is available to professional sound techs only, so plan for your engineer to run it or bring your own board.',
  },
  {
    question: 'How many people fit for a show?',
    answer:
      'Up to 125. Seated recital, standing show, or cabaret-style with a dance floor all work; the room is about 1,100 square feet with nothing bolted down.',
  },
  {
    question: 'Can we sell tickets?',
    answer:
      'Yes. Ticketed shows are welcome, and if you make your event public we help promote it: a spot on our What’s On calendar, the community bulletin board, and our social channels.',
  },
  {
    question: 'Is there a green room?',
    answer:
      'The breakout rooms and cafe lounge serve as green room and merch space, and the lounge is where audiences naturally gather at intermission.',
  },
  {
    question: 'How late can shows run?',
    answer:
      'Music ends by 10 PM under Denver neighborhood ordinances. Load-in, soundcheck, and load-out all happen within your booked rental window.',
  },
  {
    question: 'Can we serve drinks?',
    answer:
      'BYOB is allowed. Any event with alcohol needs a certificate of general liability insurance and a TIPS-certified bartender if drinks are being served; alcohol cannot be sold on premises.',
  },
];

export default function ConcertsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Concert & Performance Venue',
              description:
                'Restored 1905 church concert and performance venue in Denver with a surround sound system, cathedral ceilings, and capacity for 125 guests.',
              images: [concertsImages.songwritersRound.src, concertsImages.danceFloorCrowd.src],
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PATH, faqs)) }}
      />

      <PageHero
        image={concertsImages.songwritersRound}
        eyebrow="Concerts & Performances"
        title={
          <>
            A Room That Was
            <span className="block font-bold">Built for Sound</span>
          </>
        }
        subtitle="Cathedral ceilings and a century of acoustics, with a built-in surround system and an audience of up to 125. Sloans Lake, Denver."
        ctas={[
          { label: 'Check Availability & Book', href: '/book' },
          { label: 'Plan Your Show', href: '#inquiry', variant: 'ghost' },
        ]}
      />

      {/* Positioning */}
      <section className="pt-14 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            Why musicians play Merritt
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-8">
            Sanctuaries were the original concert halls
          </h2>
          <p className="text-lg md:text-xl text-[#6b5f5b] leading-relaxed">
            The hall was shaped for voices to carry, and it still does its best work with music
            in it. Songwriter rounds, album releases, chamber recitals, DJ nights, and dance
            parties have all run under the rose window. The surround system covers the room
            evenly, and the cafe lounge gives your audience somewhere to land between sets.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <Gallery
            heading="Shows in the Hall"
            images={[
              concertsImages.danceFloorCrowd,
              concertsImages.acousticAudience,
              concertsImages.tangoStarryCeiling,
              venueImages.cafeLounge,
              venueImages.mainHallRoseWindow,
            ]}
          />
        </div>
      </section>

      {/* Specs + pricing */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          <SpecsBlock heading="The Room" />
          <div className="max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">Rates</h2>
            <p className="text-[#6b5f5b] mb-8 max-w-2xl">
              Hourly, by day and audience size. Book {extendedDiscount.minHours}+ hours for
              load-in, show, and load-out and a {extendedDiscount.percent}% discount applies
              automatically.
            </p>
            <RateTable />
          </div>
        </div>
      </section>

      {/* Co-promotion for public shows */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <CoPromotionBlock />
        </div>
      </section>

      {/* Policies, including the mixer rule */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <PoliciesBlock
            heading="Before You Book the Band"
            extra={[{ title: 'Sound Equipment', body: mixerPolicy + ' The surround system, projector, and screen are included with the rental.' }]}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FaqSection faqs={faqs} heading="Performance Questions, Answered" />
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" className="py-24 bg-white/60">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="event"
            page={PATH}
            heading="Tell Us About Your Show"
            subheading="Genre, date, expected crowd, and whether you are bringing a sound tech; or just ask for a tour, because acoustics do not photograph. We reply with availability, usually within one business day."
            defaultEventType="Concert / performance"
            submitLabel="Send Show Inquiry"
          />
        </div>
      </section>

    </main>
  );
}
