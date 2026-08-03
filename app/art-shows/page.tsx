import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import RateTable from '@/components/venue/RateTable';
import Gallery from '@/components/venue/Gallery';
import FaqSection from '@/components/venue/FaqSection';
import InquiryForm from '@/components/venue/InquiryForm';
import CtaSection from '@/components/venue/CtaSection';
import { venueJsonLd, faqJsonLd, type Faq } from '@/lib/venue-schema';
import { venueImages, artShowsImages } from '@/app/data/venue-images';
import { extendedDiscount } from '@/app/lib/venue-rates';

const PATH = '/art-shows';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/art-shows/exhibition-stained-glass.webp';

export const metadata: Metadata = {
  title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
  description:
    'Host art shows, gallery openings, and pop-up exhibitions in a restored 1905 Denver church: natural light, hardwood floors, stained glass, and room for 125 guests near Sloans Lake.',
  keywords:
    'art show venue Denver, gallery space rental Denver, pop-up gallery Denver, exhibition space Denver, art opening venue Denver, artist market venue Colorado',
  openGraph: {
    title: 'Art Show & Exhibition Venue in Denver | Merritt Wellness',
    description:
      'Natural light, hardwood floors, and stained glass that flatters the work. A 1905 church hall for openings and exhibitions.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 1920, height: 1440, alt: artShowsImages.exhibitionStainedGlass.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Art Show & Exhibition Venue in Denver',
    description:
      'Natural light, hardwood floors, and stained glass that flatters the work. A 1905 church hall for openings and exhibitions.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
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
    question: 'Can a show run multiple days?',
    answer:
      'Yes. Multi-day exhibitions are booked as consecutive rental windows; booking 8 or more total hours triggers an automatic 10% discount. Reach out and we will map dates together.',
  },
];

export default function ArtShowsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Art Show & Exhibition Venue',
              description:
                'Restored 1905 church exhibition venue in Denver with natural light, hardwood floors, stained glass, and capacity for 125 guests.',
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
        image={artShowsImages.exhibitionStainedGlass}
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
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-8">
            A backdrop that earns its place in the photos
          </h2>
          <p className="text-lg md:text-xl text-[#6b5f5b] leading-relaxed">
            White-box galleries make work float in nothing. This hall gives it context: warm
            wood, white brick, and stained glass that shifts the light through the afternoon.
            Openings, pop-up markets, student shows, and photography exhibitions have all hung
            here, and the cafe lounge keeps conversation going long after the first pass
            through the show.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <Gallery
            heading="Exhibitions in the Hall"
            images={[
              artShowsImages.vaultedHallExhibition,
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

      {/* Policies */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <PoliciesBlock heading="Worth Knowing Before You Hang" />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
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
            subheading="Medium, number of pieces, dates you are considering. We will reply with availability, usually within one business day."
            defaultEventType="Art show / exhibition"
            submitLabel="Send Exhibition Inquiry"
          />
        </div>
      </section>

      <CtaSection
        heading="Walk the Walls First"
        body="Bring a tape measure and your maquette. Reach out to schedule a tour and plan the hang in the actual light."
      />
    </main>
  );
}
