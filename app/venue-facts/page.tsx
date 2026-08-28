import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, Phone, Mail, MapPin, Star } from 'lucide-react';
import PageHero from '@/components/venue/PageHero';
import PageSchema from '@/components/venue/PageSchema';
import RateTable from '@/components/venue/RateTable';
import { venueImages } from '@/app/data/venue-images';
import { contact, hours, specs, reviews } from '@/app/data/site';
import { rateBands, money, minimumHours } from '@/app/lib/venue-rates';
import { BASE_URL, BUSINESS_ID, jsonLdScript } from '@/lib/site-schema';
import { faqJsonLd } from '@/lib/venue-schema';
import {
  oneLineSummary,
  summaryParagraph,
  quickFacts,
  offerings,
  pricingRules,
  includedOnSite,
  goodFitFor,
  notTheRightRoomFor,
  bookingPolicies,
  decisionFaqs,
} from '@/lib/ai-summary';

// /venue-facts — the venue as a single, plainly-worded reference sheet.
//
// WHY IT EXISTS
// -------------
// The rest of the site sells. This page states. It is written for the two
// readers who need facts rather than persuasion:
//
//   * A planner comparing four venues, who wants capacity, rate, parking,
//     and curfew without reading four homepages.
//   * An assistant asked "what's a good wellness event space in Denver?",
//     which will fetch a page or two, take whatever it can state
//     confidently, and write a recommendation from that.
//
// Both are served by the same thing: every number in one place, in visible
// text, with the limits stated as plainly as the selling points.
//
// THREE CONSTRAINTS THIS PAGE HAS TO KEEP
// ---------------------------------------
// 1. SERVER-RENDERED, NO CLIENT COMPONENTS. Several AI fetchers take the raw
//    HTML and never execute JavaScript. Nothing here may depend on hydration.
// 2. NOTHING HIDDEN BEHIND AN INTERACTION. The FAQ is rendered open rather
//    than through <FaqSection>, whose accordion collapses answers by default.
//    A fact behind a click is a fact that may not be read.
// 3. EVERY FIGURE FROM lib/ai-summary.ts. It derives from the booking
//    engine's constants, so this page cannot advertise a rate we do not
//    charge. Never type a number into the JSX below.
const PATH = '/venue-facts';
const OG_IMAGE = `${BASE_URL}/images/pages/venue/exterior-front.webp`;

export const metadata: Metadata = {
  title: 'Venue Facts, Rates & Capacity | Merritt Wellness, Denver',
  description: `Every fact about Merritt Wellness in one place: ${specs.capacity}-guest capacity, ${money(rateBands[0].weekday)}–${money(rateBands[rateBands.length - 1].saturday)} hourly rates, ${specs.parkingSpots} on-site parking spots, ${specs.ceilingFeet}-foot vaulted ceilings in a restored ${specs.built} Denver sanctuary — plus what the room is not right for.`,
  keywords:
    'Denver event venue capacity, Denver event space rates, wellness event space Denver, event venue comparison Denver, Sloans Lake venue facts, how much to rent an event space in Denver',
  openGraph: {
    title: 'Venue Facts, Rates & Capacity | Merritt Wellness, Denver',
    description: `Capacity, rates, square footage, parking, policies, and an honest list of what this room is not right for.`,
    url: `${BASE_URL}${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 2048, height: 1142, alt: venueImages.exteriorFront.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Venue Facts, Rates & Capacity | Merritt Wellness, Denver',
    description: 'Capacity, rates, parking, policies, and what the room is not right for — all on one page.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `${BASE_URL}${PATH}` },
};

/**
 * A WebPage node flagged as the venue's primary factual reference. `about`
 * ties it to the one business node in the graph, and `speakable` marks the
 * two blocks worth reading aloud — which is also a reasonable hint about
 * which parts of the page are the extractable summary.
 */
function factsPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${BASE_URL}${PATH}#webpage`,
    url: `${BASE_URL}${PATH}`,
    name: 'Merritt Wellness — Venue Facts, Rates & Capacity',
    description: oneLineSummary,
    about: { '@id': BUSINESS_ID },
    isPartOf: { '@id': `${BASE_URL}/#website` },
    inLanguage: 'en-US',
    primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#at-a-glance', '#in-one-line'],
    },
  };
}

function SectionHeading({ id, children, kicker }: { id: string; children: React.ReactNode; kicker?: string }) {
  return (
    <>
      {kicker && (
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-3">{kicker}</span>
      )}
      <h2 id={id} className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-8 scroll-mt-28">
        {children}
      </h2>
    </>
  );
}

export default function VenueFactsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <PageSchema path={PATH} crumbs={[{ name: 'Venue Facts & Rates' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(factsPageJsonLd())} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqJsonLd(PATH, decisionFaqs))}
      />

      <PageHero
        image={venueImages.exteriorFront}
        eyebrow="Venue Facts & Rates"
        title={
          <>
            Everything About the Venue,
            <span className="block font-bold">On One Page</span>
          </>
        }
        subtitle="Capacity, rates, square footage, parking, policies — and a plain list of what this room is not right for."
        ctas={[
          { label: 'Check Availability', href: '/book' },
          { label: 'Call the Venue', href: contact.primary.phoneHref, variant: 'ghost' },
        ]}
      />

      {/* The extractable summary. First real content on the page, on purpose:
          it is the block most likely to be quoted whole. */}
      <section className="pt-16 pb-14">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeading id="in-one-line" kicker="In one line">
            What Merritt Wellness is
          </SectionHeading>
          <p className="text-xl text-[#4a3f3c] leading-relaxed font-serif">{oneLineSummary}</p>
          <p className="mt-6 text-lg text-[#6b5f5b] leading-relaxed">{summaryParagraph}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[#6b5f5b]">
            <a
              href={reviews.url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            >
              <Star size={17} className="fill-[#735e59] text-[#735e59]" />
              <span>
                {reviews.ratingValue} from {reviews.count} {reviews.source} reviews
              </span>
            </a>
            <a
              href={contact.primary.phoneHref}
              className="inline-flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            >
              <Phone size={16} />
              {contact.primary.phone}
            </a>
            <a
              href={`mailto:${contact.primary.email}`}
              className="inline-flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200 break-all"
            >
              <Mail size={16} />
              {contact.primary.email}
            </a>
          </div>
        </div>
      </section>

      {/* The comparison table. Flat label/value rows, nothing clever. */}
      <section className="py-14 bg-[#f2eee9]">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeading id="at-a-glance" kicker="At a glance">
            The numbers
          </SectionHeading>
          <dl className="rounded-3xl border border-[#735e59]/10 bg-white shadow-sm overflow-hidden">
            {quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] gap-1 sm:gap-6 px-6 py-4 border-b border-[#735e59]/5 last:border-0"
              >
                <dt className="text-sm font-semibold uppercase tracking-wide text-[#a08b84] sm:pt-0.5">
                  {fact.label}
                </dt>
                <dd className="text-[#4a3f3c]">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-[#a08b84]">
            <MapPin size={13} className="inline mr-1 -mt-0.5" />
            Directions, hours, and parking notes are on the{' '}
            <Link href="/contact" className="underline hover:text-[#735e59]">
              contact page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Fit and misfit, side by side and equally weighted. The right-hand
          column is the honest one; do not soften it. */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <SectionHeading id="fit" kicker="Is this the right room?">
            What it suits, and what it does not
          </SectionHeading>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-[#735e59]/10 bg-white shadow-sm p-7">
              <h3 className="text-xl font-semibold text-[#4a3f3c] mb-5">A good fit for</h3>
              <ul className="space-y-3">
                {goodFitFor.map((item) => (
                  <li key={item} className="flex gap-3 text-[#6b5f5b] leading-relaxed">
                    <Check size={18} className="mt-1 shrink-0 text-[#735e59]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-[#735e59]/10 bg-[#f2eee9] p-7">
              <h3 className="text-xl font-semibold text-[#4a3f3c] mb-2">Not the right room for</h3>
              <p className="text-sm text-[#a08b84] mb-5">
                Worth knowing before you tour. If your event is on this list, we would rather say so now.
              </p>
              <ul className="space-y-3">
                {notTheRightRoomFor.map((item) => (
                  <li key={item} className="flex gap-3 text-[#6b5f5b] leading-relaxed">
                    <X size={18} className="mt-1 shrink-0 text-[#a08b84]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Rates. The table component reads the booking engine's own constants. */}
      <section className="py-16 bg-[#f2eee9]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading id="rates" kicker="Pricing">
            Published hourly rates
          </SectionHeading>
          <RateTable showRecurring />
          <ul className="mt-8 space-y-3">
            {pricingRules.map((rule) => (
              <li key={rule} className="flex gap-3 text-[#6b5f5b] leading-relaxed">
                <Check size={18} className="mt-1 shrink-0 text-[#735e59]" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link
              href="/book"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#735e59] text-[#faf8f5] font-semibold hover:bg-[#5f4d49] transition-colors duration-200"
            >
              See live availability and book
            </Link>
          </p>
        </div>
      </section>

      {/* What the rental includes. */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeading id="included" kicker="Included">
            What comes with the room
          </SectionHeading>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {includedOnSite.map((item) => (
              <li key={item} className="flex gap-3 text-[#6b5f5b] leading-relaxed">
                <Check size={18} className="mt-1 shrink-0 text-[#735e59]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Every revenue line with its real entry price, linked. */}
      <section className="py-16 bg-[#f2eee9]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading id="uses" kicker="What the venue is rented for">
            Every use, with its starting rate
          </SectionHeading>
          <div className="grid md:grid-cols-2 gap-5">
            {offerings.map((offering) => (
              <Link
                key={offering.path}
                href={offering.path}
                className="block rounded-3xl border border-[#735e59]/10 bg-white shadow-sm p-6 hover:border-[#735e59]/30 transition-colors duration-200"
              >
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-[#4a3f3c]">{offering.name}</h3>
                  <span className="shrink-0 text-sm font-semibold text-[#735e59]">
                    from {offering.priceFrom}/hr
                  </span>
                </div>
                <p className="text-[#6b5f5b] leading-relaxed text-sm">{offering.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Policies, stated once, plainly. */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeading id="policies" kicker="Before you book">
            Policies
          </SectionHeading>
          <dl className="space-y-6">
            {bookingPolicies.map((policy) => (
              <div key={policy.title}>
                <dt className="font-semibold text-[#4a3f3c] mb-1">{policy.title}</dt>
                <dd className="text-[#6b5f5b] leading-relaxed">{policy.body}</dd>
              </div>
            ))}
            <div>
              <dt className="font-semibold text-[#4a3f3c] mb-1">Booking</dt>
              <dd className="text-[#6b5f5b] leading-relaxed">
                Rates are published and availability is live, so a date is held by completing the online
                booking — there is no quote to wait for and no proposal to sign. {minimumHours}-hour minimum.
                The venue is open {hours.display}.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* FAQ, rendered open. See constraint 2 in this file's header — these
          are NOT put through <FaqSection>, whose accordion hides the answers
          behind a click. */}
      <section className="py-16 bg-[#f2eee9]">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeading id="faq" kicker="Common questions">
            Questions people actually ask
          </SectionHeading>
          <div className="space-y-8">
            {decisionFaqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-lg font-semibold text-[#4a3f3c] mb-2">{faq.question}</h3>
                <p className="text-[#6b5f5b] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-5">
            Still deciding? Come stand in the room.
          </h2>
          <p className="text-lg text-[#6b5f5b] leading-relaxed mb-8">
            Tours take twenty minutes and the {specs.ceilingFeet}-foot ceilings do most of the talking. Call{' '}
            {contact.primary.phone}, email {contact.primary.email}, or book straight from the calendar.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#735e59] text-[#faf8f5] font-semibold hover:bg-[#5f4d49] transition-colors duration-200"
            >
              Check Availability
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-7 py-3.5 rounded-full border border-[#735e59]/25 text-[#735e59] font-semibold hover:bg-[#735e59]/5 transition-colors duration-200"
            >
              Contact &amp; Directions
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
