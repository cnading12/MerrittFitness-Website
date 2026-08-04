import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import RateTable from '@/components/venue/RateTable';
import Gallery from '@/components/venue/Gallery';
import FaqSection from '@/components/venue/FaqSection';
import InquiryForm from '@/components/venue/InquiryForm';
import { venueJsonLd, faqJsonLd, type Faq } from '@/lib/venue-schema';
import { venueImages, classesImages } from '@/app/data/venue-images';
import { openClassBlocks, workspace, specs } from '@/app/data/site';
import { rateBands, recurringDiscount, money } from '@/app/lib/venue-rates';
import { CalendarClock, ArrowRight } from 'lucide-react';

const PATH = '/class-partnerships';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/classes/dance-class-string-lights.webp';

export const metadata: Metadata = {
  title: 'Recurring Class Space in Denver | Class Partnerships | Merritt Wellness',
  description:
    'Recurring weekly class blocks in a restored 1905 Denver church: yoga, breathwork, dance, martial arts, and every movement discipline. Full-coverage floor mat, rollaway mirrors, 20% partner rates, open blocks published.',
  keywords:
    'yoga studio rental Denver, dance studio rental Denver, martial arts space Denver, recurring class space Denver, movement studio rental Sloans Lake, fitness class venue Denver',
  openGraph: {
    title: 'Recurring Class Space in Denver | Merritt Wellness',
    description:
      'Weekly class blocks in a 1905 church hall: full-coverage mat, rollaway mirrors, and partner rates 20% below standard.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 2400, height: 1603, alt: classesImages.danceClassStringLights.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recurring Class Space in Denver | Merritt Wellness',
    description:
      'Weekly class blocks in a 1905 church hall: full-coverage mat, rollaway mirrors, and partner rates 20% below standard.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

const faqs: Faq[] = [
  {
    question: 'What does the recurring discount actually come to?',
    answer: `Partners with at least ${recurringDiscount.minMonthlyHours} guaranteed hours a month get ${recurringDiscount.percent}% off every hour, weekdays and Saturdays alike. For a class under 30 students that means ${money(rateBands[0].weekdayRecurring)}/hour instead of ${money(rateBands[0].weekday)}/hour, locked in at your stored rate.`,
  },
  {
    question: 'What is on the floor?',
    answer:
      'Original hardwood, with a single full-coverage mat that rolls out over the entire space for practices that need padding, and 15 feet of rollaway mirrors for form work. Mat setup and breakdown by our staff is a flat $100 add-on, waived for partners who handle their own setup.',
  },
  {
    question: 'Which disciplines fit here?',
    answer:
      'Movement in all its forms: yoga, breathwork, sound baths, dance of every style, martial arts, tai chi, pilates, theater and rehearsal work. If your practice needs open floor, tall ceilings, and good sound, it fits.',
  },
  {
    question: 'How does billing work?',
    answer:
      'Recurring partnerships bill monthly by bank transfer at your stored discounted rate, based on the sessions that actually occur that month. No card fees on bank transfer.',
  },
  {
    question: 'Can I store equipment between classes?',
    answer:
      'Talk to us about your setup during the walkthrough. The breakout rooms handle most teachers’ gear, and we will be straight with you about what fits.',
  },
  {
    question: 'What if I need an office or desk too?',
    answer:
      'Merritt Workspace is next door, and its members get included venue hours Monday through Friday. If you are building a practice, the studio and workspace pages cover how the two properties work together.',
  },
];

export default function ClassPartnershipsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Recurring Class Space',
              description:
                'Recurring class blocks for yoga, breathwork, dance, martial arts, and movement disciplines in a restored 1905 Denver church.',
              images: [classesImages.danceClassStringLights.src, venueImages.fullCoverageMat.src],
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PATH, faqs)) }}
      />

      <PageHero
        image={classesImages.danceClassStringLights}
        eyebrow="Wellness & Movement Classes"
        title={
          <>
            Your Class,
            <span className="block font-bold">Same Time Every Week</span>
          </>
        }
        subtitle="A 1905 church hall with cathedral ceilings for yoga, breathwork, dance, martial arts, and every movement discipline in between."
        ctas={[
          { label: 'Claim an Open Block', href: '#inquiry' },
          { label: 'See Partner Rates', href: '#rates', variant: 'ghost' },
        ]}
      />

      {/* Open blocks — data-driven from app/data/site.ts */}
      <section className="pt-14 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            <CalendarClock className="w-4 h-4 mr-2" />
            Open right now
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-6">
            Open recurring blocks for {openClassBlocks.season}
          </h2>
          <p className="text-[#6b5f5b] leading-relaxed max-w-3xl mb-10">
            The week here has a rhythm: two class blocks most weekdays, larger private events
            on Fridays and Saturdays, congregations on Sunday until 4:30 PM, and a Sunday
            evening block after that. These blocks are open today; when they are claimed,
            they come off this list.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {openClassBlocks.blocks.map((block) => (
              <div key={`${block.day}-${block.time}`} className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#735e59] font-serif">{block.day}s</p>
                <p className="text-[#6b5f5b] mt-1">{block.time}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#a08b84]">
            Weekday daytime hours are often available too; ask about the slot you actually want.
            Classes open to the public get co-promoted at no charge: a What&apos;s On calendar
            listing, a bulletin-board flyer, and posts on our social channels.
          </p>
        </div>
      </section>

      {/* Movement disciplines / the room */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-6">
            Built for movement, not just yoga
          </h2>
          <p className="text-[#6b5f5b] leading-relaxed max-w-3xl mb-12">
            Yoga and sound work started here, and dance socials, line dance nights, and a youth
            martial arts program all followed. The full-coverage mat rolls out over the entire
            floor for grappling and groundwork, {specs.mirrorFeet} feet of rollaway mirrors
            handle form and technique, and the surround system fills the room without a
            portable speaker in sight.
          </p>
          <Gallery
            images={[
              classesImages.danceClassSteps,
              classesImages.breathworkClass,
              classesImages.martialArtsPractice,
              classesImages.circleRollawayMirror,
              classesImages.restorativeClass,
              venueImages.fullCoverageMat,
            ]}
          />
        </div>
      </section>

      {/* Rates */}
      <section id="rates" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">
            Partner rates: {recurringDiscount.percent}% off, automatically
          </h2>
          <p className="text-[#6b5f5b] mb-10 max-w-2xl">
            Commit to at least {recurringDiscount.minMonthlyHours} hours a month and every hour
            bills at the partner rate; no code, no negotiation. A weekly two-hour class clears
            the bar on its own.
          </p>
          <RateTable
            showRecurring
            footnote={`Recurring partner rates shown for Sunday to Friday; Saturday partner blocks get the same ${recurringDiscount.percent}% off the Saturday rate. Two-hour minimum per session.`}
          />
        </div>
      </section>

      {/* Specs */}
      <section className="py-16 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <SpecsBlock heading="The Room, By the Numbers" />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FaqSection faqs={faqs} heading="Partnership Questions, Answered" />
        </div>
      </section>

      {/* Workspace cross-link */}
      <section className="py-16 bg-white/60">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-[#735e59] rounded-3xl p-10 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-light text-[#f2eee9] font-serif mb-4">
              Teaching here and need a desk or office?
            </h2>
            <p className="text-[#f2eee9]/85 leading-relaxed max-w-2xl mx-auto mb-8">
              {workspace.name} is next door, and members get included venue hours here every
              month. An office beside your classroom, in a building your clients already know.
            </p>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 bg-[#f2eee9] text-[#735e59] font-bold px-8 py-4 rounded-full shadow-lg hover:bg-white hover:-translate-y-1 transition-all duration-300"
            >
              Studio & Workspace Options
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="class-partnership"
            page={PATH}
            heading="Claim a Block"
            subheading="Tell us your discipline, class size, and the block you want, listed above or otherwise; or ask to walk through and teach a trial class. We reply with availability, usually within one business day."
            showEventFields={false}
            showStartWindow
            submitLabel="Start the Conversation"
          />
        </div>
      </section>

    </main>
  );
}
