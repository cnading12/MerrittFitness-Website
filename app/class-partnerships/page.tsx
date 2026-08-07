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
import { workspace, specs, contact } from '@/app/data/site';
import { rateBands, recurringDiscount, money } from '@/app/lib/venue-rates';
import { CalendarClock, ArrowRight } from 'lucide-react';

const PATH = '/class-partnerships';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/classes/dance-class-string-lights.webp';

export const metadata: Metadata = {
  title: 'Wellness & Movement Class Space in Denver | Merritt Wellness',
  description:
    'Host yoga, breathwork, sound baths, dance, and martial arts at a historic Denver wellness center. Book a one-time workshop, a pop-up series, or a weekly block; full-coverage floor mat, rollaway mirrors, and partner rates for regulars.',
  keywords:
    'yoga studio rental Denver, dance studio rental Denver, martial arts space Denver, recurring class space Denver, movement studio rental Sloans Lake, fitness class venue Denver',
  openGraph: {
    title: 'Wellness & Movement Class Space in Denver | Merritt Wellness',
    description:
      'One workshop or every week: a historic 1905 wellness center with a full-coverage mat, rollaway mirrors, and partner rates for regulars.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 2400, height: 1603, alt: classesImages.danceClassStringLights.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wellness & Movement Class Space in Denver | Merritt Wellness',
    description:
      'One workshop or every week: a historic 1905 wellness center with a full-coverage mat, rollaway mirrors, and partner rates for regulars.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

const faqs: Faq[] = [
  {
    question: 'Do I have to commit to a weekly slot?',
    answer:
      'No. One-time and occasional bookings are a big part of what happens here; book any open date at the standard hourly rate through the booking page. A standing weekly block is simply there when your practice wants one, and it unlocks the partner discount.',
  },
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
              name: 'Merritt Wellness — Wellness & Movement Class Space',
              description:
                'Space for yoga, breathwork, sound baths, dance, and martial arts at a historic Denver wellness center, from one-time workshops to weekly classes.',
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
            A Sanctuary
            <span className="block font-bold">Built for Practice</span>
          </>
        }
        subtitle="Yoga, breathwork, sound baths, dance, and martial arts under 24-foot ceilings. Book it for one workshop, a pop-up series, or the same hour every week."
        ctas={[
          { label: 'Check Availability & Book', href: '/book' },
          { label: 'See Rates', href: '#rates', variant: 'ghost' },
        ]}
      />

      {/* One-time and recurring booking paths */}
      <section className="pt-14 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
              <CalendarClock className="w-4 h-4 mr-2" />
              Open right now
            </span>
            <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-6">
              One workshop or every week
            </h2>
          </div>
          <div className="text-[#6b5f5b] leading-relaxed max-w-3xl mx-auto text-center space-y-5">
            <p>
              Plenty of what happens here is one-time or now-and-then: a sound bath, a
              teacher training, a seasonal workshop series. Book a single date whenever the
              calendar is open, and if your practice settles into a rhythm, a standing
              weekly block is yours to claim. For recurring classes we aim for evening
              blocks of 5 to 7 PM and 7 to 9 PM, and daytime hours are open for the
              practices that want them.
            </p>
            <p>
              To find a class time that fits, check real-time availability on the{' '}
              <Link href="/book" className="underline decoration-[#735e59]/40 hover:text-[#735e59] font-semibold">
                booking calendar
              </Link>
              , which shows every open date and time, or email{' '}
              <a
                href={`mailto:${contact.inquiries.email}`}
                className="underline decoration-[#735e59]/40 hover:text-[#735e59] font-semibold"
              >
                {contact.inquiries.email}
              </a>{' '}
              and we will walk the open blocks with you.
            </p>
          </div>
          <p className="mt-8 text-sm text-[#a08b84] text-center max-w-3xl mx-auto">
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
              classesImages.soundBathCandlelight,
              classesImages.breathworkClass,
              classesImages.soundBathGathering,
              classesImages.martialArtsPractice,
              classesImages.circleRollawayMirror,
              classesImages.soundBathRoseWindow,
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
            Simple hourly rates, one-time or weekly
          </h2>
          <p className="text-[#6b5f5b] mb-10 max-w-2xl">
            One-off sessions book at the standard hourly rate. Regulars do better: reach{' '}
            {recurringDiscount.minMonthlyHours} hours a month and every hour bills at the
            partner rate, {recurringDiscount.percent}% off automatically; a weekly two-hour
            class clears the bar on its own.
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
