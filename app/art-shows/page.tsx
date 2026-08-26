import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import PageSchema from '@/components/venue/PageSchema';
import SpecsBlock from '@/components/venue/SpecsBlock';
import RateTable from '@/components/venue/RateTable';
import Gallery from '@/components/venue/Gallery';
import FaqSection from '@/components/venue/FaqSection';
import InquiryForm from '@/components/venue/InquiryForm';
import CoPromotionBlock from '@/components/venue/CoPromotionBlock';
import { venueJsonLd, faqJsonLd, type Faq } from '@/lib/venue-schema';
import { venueImages, artShowsImages } from '@/app/data/venue-images';
import { specs } from '@/app/data/site';
import Link from 'next/link';
import { extendedDiscount, recurringDiscount, rateBands } from '@/app/lib/venue-rates';

const PATH = '/art-shows';
const OG_IMAGE = 'https://www.merrittwellness.net/images/pages/art-shows/exhibition-stained-glass.webp';

export const metadata: Metadata = {
  title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
  description:
    'Host art shows, gallery openings, and pop-up exhibitions in a historic Denver art gallery: natural light, hardwood floors, stained glass, and room for 125 guests near Sloans Lake.',
  keywords:
    'art show venue Denver, gallery space rental Denver, pop-up gallery Denver, exhibition space Denver, art opening venue Denver, artist market venue Colorado',
  openGraph: {
    title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
    description:
      'Natural light, hardwood floors, and stained glass that flatters the work. A century-old gallery hall for openings and exhibitions.',
    url: `https://www.merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 1920, height: 1440, alt: artShowsImages.exhibitionStainedGlass.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Art Show & Exhibition Venue in Denver',
    description:
      'Natural light, hardwood floors, and stained glass that flatters the work. A century-old gallery hall for openings and exhibitions.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://www.merrittwellness.net${PATH}` },
};

const faqs: Faq[] = [
  {
    question: 'How is work displayed?',
    answer:
      'Most shows hang work along the wood-framed partition wall and the white brick wall, and round out the show with easels and tables across the floor. The room is flexible; walk it with us and plan your layout.',
  },
  {
    question: 'Can artists sell their work at the show?',
    answer:
      'Yes. Sales of artwork are up to you and your artists. Note that alcohol is different: it can be served but never sold on premises.',
  },
  {
    question: 'What is the light like?',
    answer:
      'Tall arched windows on two walls bring in generous daylight, and the stained glass throws warm color across the hall in the afternoon. Evening shows run on the warm interior lighting.',
  },
  {
    question: 'Can we pour wine at the opening?',
    answer:
      'Yes, BYOB is welcome. An opening with alcohol needs a certificate of general liability insurance and a TIPS-certified bartender if drinks are being served.',
  },
  {
    question: 'How many people can attend an opening?',
    answer:
      'Up to 125 guests. Openings tend to flow between the main hall and the cafe lounge, which comfortably absorbs the crowd around the work.',
  },
  {
    question: 'Can I run a recurring art class here, not just a one-off show?',
    answer:
      `Yes, and we are actively looking for them. Paint-and-sip nights, life drawing, kids’ classes, and multi-week workshop series all work well in the hall. A standing block bills at the partner rate — ${recurringDiscount.percent}% off every hour — once you reach ${recurringDiscount.minMonthlyHours} hours a month, which a weekly two-hour class clears on its own, and public sessions get co-promoted on our calendar at no charge.`,
  },
  {
    question: 'Can a show run multiple days?',
    answer:
      'Yes. Multi-day exhibitions are booked as consecutive rental windows; booking 8 or more total hours triggers an automatic 10% discount. Reach out and we will map dates together.',
  },
  {
    question: 'How late can an opening run, and when do we hang and take down?',
    answer:
      'Events end by 10 PM. Hanging, styling, and breakdown all happen within your booked rental window, so build that time into the hours you reserve.',
  },
  {
    question: 'Is the gallery space accessible?',
    answer:
      'The front entrance has ramp access and the main hall is on the entry level. Main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at Merritt Workspace.',
  },
];

export default function ArtShowsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <PageSchema
        path={PATH}
        crumbs={[{ name: 'Events' }, { name: 'Art Shows & Exhibitions' }]}
        service={{
          name: 'Art Show & Exhibition Space',
          serviceType: 'Gallery and exhibition space',
          description:
            'Gallery openings, exhibitions, and pop-up artist markets in a historic Denver hall with natural light, hardwood floors, and tall walls.',
          priceFrom: rateBands[0].weekday,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Art Show & Exhibition Venue',
              description:
                'Historic 1905 art gallery and exhibition hall in Denver with natural light, hardwood floors, stained glass, and capacity for 125 guests.',
              images: [artShowsImages.exhibitionStainedGlass.src, artShowsImages.vaultedHallExhibition.src],
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PATH, faqs)) }}
      />

      <PageHero
        image={artShowsImages.vaultedHallExhibition}
        eyebrow="Art Shows & Exhibitions"
        title={
          <>
            Hang the Work.
            <span className="block font-bold">The Room Does the Rest.</span>
          </>
        }
        subtitle="Natural light, hardwood floors, and a century-old hall that makes every wall feel like a gallery. Sloans Lake, Denver."
        ctas={[
          { label: 'Check Availability & Book', href: '/book' },
          { label: 'Plan Your Show', href: '#inquiry', variant: 'ghost' },
        ]}
      />

      {/* Positioning */}
      <section className="pt-14 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            Why artists show at Merritt
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-8">
            A backdrop that earns its place in the photos
          </h2>
          <p className="text-lg md:text-xl text-[#6b5f5b] leading-relaxed">
            White-box galleries make work float in nothing. This hall gives it context: warm
            wood, white brick, and stained glass that shifts the light through the afternoon.
            Openings, pop-up markets, student shows, and photography exhibitions have all hung
            here, and the cafe lounge keeps conversation going long after the first pass
            through the show. We also host the teaching side of the art world — paint
            nights, life drawing, kids&apos; classes — and we are actively looking for more
            of it.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <Gallery
            heading="Exhibitions in the Hall"
            images={[
              artShowsImages.exhibitionStainedGlass,
              artShowsImages.artShowTables,
              artShowsImages.visitorsBrowsing,
              artShowsImages.partitionWallPaintings,
              artShowsImages.paintingsOverPews,
            ]}
          />
        </div>
      </section>

      {/* Specs + pricing */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          <SpecsBlock heading="The Space" />
          <div className="max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">Rates</h2>
            <p className="text-[#6b5f5b] mb-8 max-w-2xl">
              Hourly, by day and guest count. Multi-day shows that reach{' '}
              {extendedDiscount.minHours} total hours get {extendedDiscount.percent}% off
              automatically.
            </p>
            <RateTable />
          </div>
        </div>
      </section>

      {/* Teaching partnerships.
          The page sold exhibitions and nothing else — every section addressed
          an artist with a show to hang, i.e. one date and then gone. The
          recurring side of the art programme (paint-and-sip nights, life
          drawing, kids' classes, multi-week workshops) had no entry point on
          the page at all, even though it is the half we are actively
          recruiting. Rates and terms come from /recurring; this block is the
          invitation, not a second rate card. */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#735e59]/10 shadow-sm">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-5">
              We are looking for partners
            </span>
            <h2 className="text-2xl md:text-3xl font-light text-[#4a3f3c] font-serif mb-4">
              Teach here, not just show here
            </h2>
            <p className="text-[#6b5f5b] leading-relaxed mb-4">
              We are actively looking for artists and studios to run something regular in
              this room: paint-and-sip nights, life drawing sessions, kids&apos; art classes,
              multi-week workshop series, printmaking or ceramics intensives. Hardwood floors
              that take a spill, tall walls for finished work, natural light through the
              afternoon, breakout rooms for supplies between sessions, and{' '}
              {specs.parkingSpots} on-site parking spots so your students are not circling
              the block.
            </p>
            <p className="text-[#6b5f5b] leading-relaxed mb-6">
              A standing block bills at the partner rate — {recurringDiscount.percent}% off
              every hour once you reach {recurringDiscount.minMonthlyHours} hours a month,
              which a weekly two-hour class clears on its own. Public sessions get co-promoted
              on our calendar and social channels at no charge, the same as every other class
              here.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/recurring"
                className="inline-flex items-center gap-2 bg-[#735e59] text-[#f2eee9] font-semibold px-6 py-3 rounded-xl hover:bg-[#5a4a46] transition-colors duration-300"
              >
                Recurring rates &amp; terms
              </Link>
              <a
                href="#inquiry"
                className="inline-flex items-center gap-2 bg-white text-[#735e59] font-semibold px-6 py-3 rounded-xl border border-[#735e59]/20 hover:border-[#735e59]/40 transition-colors duration-300"
              >
                Pitch us your class
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Resident artist credit */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#735e59]/10 shadow-sm text-center">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-5">
              On our walls now
            </span>
            <h2 className="text-2xl md:text-3xl font-light text-[#4a3f3c] font-serif mb-4">
              Resident artist: Karen Borthick
            </h2>
            <p className="text-[#6b5f5b] leading-relaxed max-w-2xl mx-auto">
              The paintings hanging in the hall today, including several of the works in the
              photos above, are by Denver artist Karen Borthick. Her show lives with us
              between events, which is its own answer to how art looks in this room. See more
              of her work at{' '}
              <a
                href="https://www.karenborthickart.com"
                className="underline decoration-[#735e59]/40 hover:text-[#735e59] font-semibold"
              >
                karenborthickart.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Co-promotion for public openings */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <CoPromotionBlock />
        </div>
      </section>

      {/* FAQ — policies (hours, setup, accessibility, alcohol) live here too */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <FaqSection faqs={faqs} heading="Exhibition Questions, Answered" />
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" className="py-24 bg-white/60">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="event"
            page={PATH}
            heading="Tell Us About Your Show"
            subheading="Medium, number of pieces, dates you are considering; or ask to walk the walls with a tape measure first. We reply with availability, usually within one business day."
            defaultEventType="Art show / exhibition"
            submitLabel="Send Exhibition Inquiry"
          />
        </div>
      </section>

    </main>
  );
}
