import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import PricingBlock from '@/components/venue/PricingBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import FAQSection, { Faq } from '@/components/venue/FAQSection';
import GalleryGrid from '@/components/venue/GalleryGrid';
import InquirySection from '@/components/venue/InquirySection';
import { VENUE, SPECS } from '@/app/data/venue';
import {
  OPEN_CLASS_BLOCKS,
  OPEN_BLOCKS_SEASON,
  WEEKLY_RHYTHM,
  WORKSPACE_MEMBER_BENEFIT,
} from '@/app/data/partnerships';

const SHARE_IMAGE = `${VENUE.url}/images/events/venue/dance/3.JPG`;

export const metadata: Metadata = {
  title: 'Recurring Class Space for Rent in Denver | Merritt Wellness',
  description:
    'A recurring home for your class in a restored 1905 Denver church: yoga, dance, martial arts, and movement of every kind. Published open blocks, automatic 20% partner discount at 8+ hours a month, full-hall roll-out mat and 15 feet of rollaway mirrors.',
  keywords:
    'class space rental Denver, yoga studio rental Denver, dance studio rental Denver, martial arts space Denver, recurring class venue Denver, hourly studio rental Sloans Lake',
  alternates: { canonical: `${VENUE.url}/class-partnerships` },
  openGraph: {
    title: 'Recurring Class Space for Rent in Denver | Merritt Wellness',
    description:
      'Run your weekly class under 24-foot ceilings. Open recurring blocks published below; 8+ hours a month earns 20% off automatically.',
    url: `${VENUE.url}/class-partnerships`,
    siteName: 'Merritt Wellness',
    images: [{ url: SHARE_IMAGE, width: 4240, height: 2832, alt: 'A dance class mid-step on the hardwood floor of the main hall at Merritt Wellness' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recurring Class Space for Rent in Denver | Merritt Wellness',
    description: 'A recurring home for yoga, dance, and martial arts classes in a 1905 Denver church.',
    images: [SHARE_IMAGE],
  },
};

const FAQS: Faq[] = [
  {
    question: 'What kinds of classes does the space host?',
    answer:
      'Movement in the broadest sense: yoga, breathwork, and sound baths; dance from ecstatic to line dancing to kids\' classes; and martial arts including judo, BJJ, wrestling, and tai chi. If your discipline needs open floor and high ceilings, it fits.',
  },
  {
    question: 'What is the floor like?',
    answer:
      'Original hardwood throughout. For grappling and floor work there is a single full-coverage mat that rolls out over the entire main hall, and 15 feet of rollaway mirrors for dance and technique work.',
  },
  {
    question: 'How does the partner discount work?',
    answer:
      'Any recurring schedule that guarantees at least 8 hours a month bills at 20% off the hourly rate automatically, weekday and Saturday alike. The discount is applied at intake; there is no code to remember.',
  },
  {
    question: 'Can students drop in and pay the venue?',
    answer:
      'No, you run your own registration and payments. You rent the room; your class, brand, pricing, and roster stay yours.',
  },
  {
    question: 'Is equipment included?',
    answer:
      'The room comes with the sound system and projector. The full-hall roll-out mat can be added per booking, and it is included at no charge for recurring partners, who handle their own mat setup and breakdown.',
  },
  {
    question: 'What if I also need an office or treatment room?',
    answer:
      'Merritt Workspace next door offers dedicated desks, private offices, and private studios, and members get monthly venue hours at Merritt Wellness included. See the Studio & Workspace page for how the two buildings work together.',
  },
];

const GALLERY = [
  {
    src: '/images/events/venue/dance/3.JPG',
    alt: 'A line dancing class mid-step on the hardwood floor of the main hall',
  },
  {
    src: '/images/events/venue/martial-arts/1.JPG',
    alt: 'A kids judo class seated on the full-coverage roll-out mat beneath the stained glass windows',
  },
  {
    src: '/images/events/venue/wellness/2.webp',
    alt: 'A restorative yoga class resting on mats in the upstairs hall',
  },
  {
    src: '/images/events/venue/wellness/3-yoga-class.webp',
    alt: 'A yoga class flowing through poses in the main hall',
  },
  {
    src: '/images/events/dance/teaching.webp',
    alt: 'An instructor teaching a dance phrase to students in the main hall',
  },
  {
    src: '/images/events/venue/wellness/7-mats.jpg',
    alt: 'The full-coverage roll-out mat covering the entire main hall floor beneath the stained glass',
  },
];

export default function ClassPartnershipsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <PageHero
        image="/images/events/venue/dance/3.JPG"
        imageAlt="Dancers practicing in the high-ceilinged main hall of the 1905 church"
        eyebrow="Recurring Class Partnerships"
        title={
          <>
            Give your class
            <span className="block font-bold">a home worth showing up to</span>
          </>
        }
        subtitle="Yoga, dance, martial arts, and every discipline between. Weekly blocks in a restored 1905 church, with partner pricing that rewards consistency."
        primaryCta={{ href: '/booking', label: 'Apply for a recurring block' }}
        secondaryCta={{ href: '#open-blocks', label: 'See open blocks' }}
      />

      {/* Positioning */}
      <section className="py-16 bg-[#faf8f5]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xl md:text-2xl text-[#4a3f3c] font-serif font-light leading-relaxed">
            Your students remember where they practice. This building gives a weekly class the kind
            of room people rearrange their schedule for: 24-foot ceilings, hardwood floors,
            stained glass light, and a full-hall roll-out mat plus 15 feet of rollaway mirrors for
            the disciplines that need them.
          </p>
        </div>
      </section>

      {/* Open blocks — data-driven, edit app/data/partnerships.ts */}
      <section id="open-blocks" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-4">
            Open recurring blocks
          </h2>
          <p className="text-[#6b5f5b] text-center mb-10">
            Published as they open. These blocks are available for {OPEN_BLOCKS_SEASON}.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {OPEN_CLASS_BLOCKS.map((block) => (
              <div
                key={`${block.day}-${block.time}`}
                className="bg-[#faf8f5] rounded-2xl p-6 text-center border border-[#735e59]/15 shadow-sm"
              >
                <div className="text-lg font-bold text-[#4a3f3c] font-serif">{block.day}</div>
                <div className="text-[#735e59] font-semibold">{block.time}</div>
                {block.note && <div className="text-xs text-[#a08b84] mt-2">{block.note}</div>}
              </div>
            ))}
          </div>
          <p className="text-sm text-[#a08b84] text-center mt-6">
            A block not listed? Ask anyway; schedules shift each season.
          </p>
        </div>
      </section>

      {/* The weekly rhythm */}
      <section className="py-16 bg-[#f2eee9]/60">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
            How the week runs
          </h2>
          <div className="space-y-4">
            {WEEKLY_RHYTHM.map((row) => (
              <div key={row.days} className="bg-white rounded-2xl p-6 border border-[#735e59]/10 shadow-sm sm:flex sm:items-baseline sm:gap-6">
                <div className="font-bold text-[#4a3f3c] font-serif sm:w-44 shrink-0 mb-1 sm:mb-0">{row.days}</div>
                <div className="text-[#6b5f5b] leading-relaxed">{row.use}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
            Movement that already calls this home
          </h2>
          <GalleryGrid images={GALLERY} />
        </div>
      </section>

      <SpecsBlock heading="The room your class gets" />

      <PricingBlock
        heading="Partner pricing"
        intro="Hourly rates by class size, with the recurring partner rate applied automatically when your schedule guarantees 8 or more hours a month."
        showRecurring
      />

      {/* Workspace cross-link */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[#735e59] rounded-3xl p-8 sm:p-10 text-[#f2eee9] sm:flex sm:items-center sm:gap-8">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-light font-serif mb-3">
                Teach here, office next door
              </h2>
              <p className="text-[#f2eee9]/85 leading-relaxed mb-4">
                {VENUE.workspaceName} members book this venue at no additional cost on weekdays,
                with {WORKSPACE_MEMBER_BENEFIT.tiers[0].includedHoursPerMonth} included hours a
                month on a dedicated desk and{' '}
                {WORKSPACE_MEMBER_BENEFIT.tiers[1].includedHoursPerMonth} on a private office. If
                you are building a practice, the two buildings were made to work together.
              </p>
              <Link
                href="/studio"
                className="inline-block bg-[#f2eee9] text-[#735e59] font-semibold px-6 py-3 rounded-full hover:bg-white transition-colors duration-200"
              >
                See Studio &amp; Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PoliciesBlock heading="House notes" include={['End time', 'Setup and breakdown', 'Accessibility']} />

      <FAQSection heading="Questions instructors ask" faqs={FAQS} />

      <InquirySection
        eventType="Recurring class partnership"
        heading="Tell us about your class"
        intro="Discipline, class size, and the days you are eyeing. Our manager will come back with real availability."
      />
    </main>
  );
}
