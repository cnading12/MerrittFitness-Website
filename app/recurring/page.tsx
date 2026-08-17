import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/venue/PageHero';
import PageSchema from '@/components/venue/PageSchema';
import RateTable from '@/components/venue/RateTable';
import InquiryForm from '@/components/venue/InquiryForm';
import FaqSection from '@/components/venue/FaqSection';
import { venueJsonLd, faqJsonLd, type Faq } from '@/lib/venue-schema';
import { venueImages } from '@/app/data/venue-images';
import { rateBands, recurringDiscount, money, minimumHours } from '@/app/lib/venue-rates';
import { coPromotion, contact } from '@/app/data/site';
import { ArrowRight } from 'lucide-react';

const PATH = '/recurring';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/venue/sunlit-hall-partition.webp';

export const metadata: Metadata = {
  title: 'Recurring Booking Rates | Partnerships at Merritt Wellness Denver',
  description:
    'Partner rates for recurring bookings at Merritt Wellness: 20% off every hour at 8+ hours a month, simple monthly billing by bank transfer, and the same historic 1905 hall each week. Classes, gatherings, rehearsals, and more.',
  keywords:
    'recurring venue rental Denver, weekly rehearsal space Denver, recurring event space rates Denver, venue partnership Denver, monthly venue rental Sloans Lake',
  openGraph: {
    title: 'Recurring Booking Rates | Merritt Wellness Denver',
    description:
      'Hold a weekly block in a historic Denver event center: 20% partner rates, simple monthly billing, one home for your community.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 1800, height: 2400, alt: venueImages.sunlitHallPartition.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recurring Booking Rates | Merritt Wellness Denver',
    description:
      'Hold a weekly block in a historic Denver event center: 20% partner rates, simple monthly billing, one home for your community.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

// The type pages a recurring partner usually comes from.
const partnerUses = [
  {
    title: 'Wellness & Movement Classes',
    href: '/class-partnerships',
    description: 'Yoga, breathwork, dance, martial arts, and every movement discipline, with published open blocks.',
  },
  {
    title: 'Faith & Community Gatherings',
    href: '/congregations',
    description: 'Congregations and spiritual communities, structured as a flat monthly rate around your schedule.',
  },
  {
    title: 'Studio & Workspace',
    href: '/studio',
    description: 'The flex-studio waitlist, plus offices and desks next door with included venue hours.',
  },
];

// Every answer below restates a rule that already exists somewhere in this
// codebase — the discount constants in booking-pricing.js, the monthly
// bank-transfer billing in monthly-billing.js, the co-promotion block in
// site.ts. Nothing here is a new policy. If a rule changes, change it at the
// source and let these read from it; do not invent an answer to fill a gap.
const faqs: Faq[] = [
  {
    question: 'What counts as a recurring booking?',
    answer: `Any standing block totalling ${recurringDiscount.minMonthlyHours} or more hours a month. A weekly two-hour class clears it on its own. There is no application, no promo code, and nothing to negotiate — book the block and every hour bills at the partner rate, ${recurringDiscount.percent}% below standard.`,
  },
  {
    question: 'How much do recurring bookings cost?',
    answer: `The partner rate is ${recurringDiscount.percent}% off whatever your booking would otherwise cost, so it tracks guest count and day the same way standard rates do. For groups under 30 that is ${money(rateBands[0].weekday)} an hour down to ${money(rateBands[0].weekdayRecurring)}. The same ${recurringDiscount.percent}% comes off Saturday rates. Each session has a ${minimumHours}-hour minimum.`,
  },
  {
    question: 'How and when am I billed?',
    answer: 'Monthly, by bank transfer, at your stored partner rate, for the sessions that actually happened that month — not a flat retainer. Bank transfer carries no card processing fee, so the rate you agree is the rate you pay.',
  },
  {
    question: 'What happens if I skip a week or need to change the schedule?',
    answer: `You are billed for sessions that occur, so a skipped week is not billed. Schedule changes made before the charge date land on that month's invoice. Once your block is running, changes go through client services at ${contact.clientServices.email} or ${contact.clientServices.phone}.`,
  },
  {
    question: 'Do I keep the same room and time every week?',
    answer: 'Yes — that is the point of a standing block. Same room, same hours, week after week, so your community learns one place and one time rather than chasing a room around a schedule.',
  },
  {
    question: 'Who books recurring blocks here?',
    answer: 'Yoga, breathwork, sound bath, dance, and martial arts teachers; congregations and spiritual communities, two of which meet here every Sunday; bands and theatre groups rehearsing; and neighborhood groups that meet monthly. If it happens on a schedule and needs open floor, tall ceilings, and good sound, it fits.',
  },
  {
    question: 'Will you help promote my class?',
    answer: `${coPromotion.body} That applies to recurring blocks the same as one-off events: ${coPromotion.channels.join(', ').toLowerCase()}.`,
  },
  {
    question: 'Can I try a one-off session before committing to a block?',
    answer: `Yes, and most partners do. Book a single session at the standard rate, see how the room works for your practice, and convert to a standing block when you are ready. Reach out at ${contact.inquiries.phone} or ${contact.inquiries.email} and we will walk you through the room first.`,
  },
];

export default function RecurringPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <PageSchema
        path={PATH}
        crumbs={[{ name: 'Partnerships' }, { name: 'Recurring Bookings & Rates' }]}
        service={{
          name: 'Recurring Booking Partnership',
          serviceType: 'Recurring venue partnership',
          description:
            'A standing weekly block in a historic Denver hall at partner rates, with simple monthly billing, for instructors, congregations, rehearsals, and community groups.',
          priceFrom: rateBands[0].weekdayRecurring,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Recurring Booking Partnerships',
              description:
                'Recurring booking partnerships at a historic 1905 Denver event center: 20% partner rates at 8+ monthly hours with simple monthly billing.',
              images: [venueImages.sunlitHallPartition.src, venueImages.mainHallRoseWindow.src],
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PATH, faqs)) }}
      />

      <PageHero
        image={venueImages.sunlitHallPartitionWide}
        eyebrow="Partnerships"
        title={
          <>
            Book It Weekly.
            <span className="block font-bold">Pay Partner Rates.</span>
          </>
        }
        subtitle="Anything hosted here once can happen here every week: classes, gatherings, rehearsals, club nights. Hold a standing block and every hour costs less."
        ctas={[
          { label: 'Ask About a Standing Block', href: '#inquiry' },
          { label: 'See the Rates', href: '#rates', variant: 'ghost' },
        ]}
      />

      {/* How partnerships work */}
      <section className="pt-14 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
              Partnerships
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-8">
              How a partnership works
            </h2>
          </div>
          <div className="space-y-5 text-lg text-[#6b5f5b] leading-relaxed">
            <p>
              Commit to at least {recurringDiscount.minMonthlyHours} hours a month and every
              hour bills at the partner rate, {recurringDiscount.percent}% below standard. A
              weekly two-hour block clears the bar on its own; there is no code to enter and
              nothing to negotiate.
            </p>
            <p>
              Billing is monthly, by bank transfer, at your stored rate, for the sessions that
              actually happen that month. Each session has a {minimumHours}-hour minimum, and
              your slot is yours: same room, same hours, week after week.
            </p>
          </div>
        </div>
      </section>

      {/* Rates */}
      <section id="rates" className="py-24 bg-white/60">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">
            Partner rates, side by side
          </h2>
          <p className="text-[#6b5f5b] mb-10 max-w-2xl">
            The partner column is what recurring bookings pay: {money(rateBands[0].weekday)}
            /hour becomes {money(rateBands[0].weekdayRecurring)}/hour for groups under 30, and
            the {recurringDiscount.percent}% discount applies to Saturday rates too.
          </p>
          <RateTable
            showRecurring
            footnote={`Recurring partner rates shown for Sunday to Friday; Saturday partner blocks get the same ${recurringDiscount.percent}% off the Saturday rate. ${minimumHours}-hour minimum per session.`}
          />
        </div>
      </section>

      {/* Where partners land */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-10">
            What partners run here
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {partnerUses.map((use) => (
              <Link
                key={use.href}
                href={use.href}
                className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl border border-[#735e59]/10 hover:-translate-y-2 transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-2">{use.title}</h3>
                <p className="text-[#6b5f5b] text-sm leading-relaxed mb-4">{use.description}</p>
                <span className="inline-flex items-center gap-2 text-[#735e59] font-semibold text-sm">
                  Learn more
                  <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FaqSection faqs={faqs} heading="Partnership Questions, Answered" />
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" className="py-24 bg-white/60">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="class-partnership"
            page={PATH}
            heading="Ask About a Standing Block"
            subheading="Tell us what you run, how often, and when you would want the room; or ask for a walkthrough first. We reply with availability and a real monthly number, usually within one business day."
            showEventFields={false}
            showStartWindow
            submitLabel="Start the Conversation"
          />
        </div>
      </section>
    </main>
  );
}
