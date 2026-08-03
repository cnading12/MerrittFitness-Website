import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/venue/PageHero';
import InquirySection from '@/components/venue/InquirySection';
import { VENUE } from '@/app/data/venue';
import { WORKSPACE_MEMBER_BENEFIT } from '@/app/data/partnerships';

const SHARE_IMAGE = `${VENUE.url}/images/hero/outside5.webp`;

export const metadata: Metadata = {
  title: 'Studio & Workspace for Practitioners in Denver | Merritt Wellness',
  description:
    'Studio and workspace options for Denver practitioners: the basement studio at Merritt Wellness (waitlist open), plus private offices, studios, and dedicated desks next door at Merritt Workspace. Members get monthly venue hours in the 1905 church included.',
  keywords:
    'practitioner studio Denver, therapy office rental Denver, wellness office space Denver, coworking for practitioners Denver, dedicated desk Denver, Sloans Lake office space',
  alternates: { canonical: `${VENUE.url}/studio` },
  openGraph: {
    title: 'Studio & Workspace for Practitioners in Denver | Merritt Wellness',
    description:
      'An office next door, classes in a 1905 church included. Studio and workspace options across the two Merritt buildings.',
    url: `${VENUE.url}/studio`,
    siteName: 'Merritt Wellness',
    images: [{ url: SHARE_IMAGE, width: 1920, height: 1071, alt: 'The Merritt Wellness church and the Merritt Workspace building side by side' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Studio & Workspace for Practitioners in Denver | Merritt Wellness',
    description: 'Studio, office, and desk options across the two Merritt buildings in Sloans Lake.',
    images: [SHARE_IMAGE],
  },
};

export default function StudioPage() {
  const [desk, office] = WORKSPACE_MEMBER_BENEFIT.tiers;

  return (
    <main className="bg-[#faf8f5] font-sans">
      <PageHero
        image="/images/hero/outside5.webp"
        imageAlt="The restored 1905 church and the Merritt Workspace building side by side on Irving Street"
        eyebrow="Studio & Workspace"
        title={
          <>
            Two buildings,
            <span className="block font-bold">one practice</span>
          </>
        }
        subtitle="A studio in the church, an office next door, or a desk to start from. Three ways to base your practice at Merritt."
        primaryCta={{ href: '#member-benefit', label: 'See the member benefit' }}
        secondaryCta={{ href: '#waitlist', label: 'Join the studio waitlist' }}
      />

      {/* THE member benefit — centerpiece */}
      <section id="member-benefit" className="py-20 bg-[#735e59]">
        <div className="max-w-4xl mx-auto px-6 text-center text-[#f2eee9]">
          <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/10 backdrop-blur-sm text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            The Merritt member benefit
          </span>
          <h2 className="text-3xl md:text-5xl font-light font-serif mb-6">
            An office next door.
            <span className="block font-bold">A 1905 church included.</span>
          </h2>
          <p className="text-[#f2eee9]/85 max-w-2xl mx-auto leading-relaxed mb-10">
            {VENUE.workspaceName} members book the Merritt Wellness venue at no additional cost,{' '}
            {WORKSPACE_MEMBER_BENEFIT.window}. Run your client sessions, workshops, or classes
            under cathedral ceilings, included with your membership. No other coworking space in
            the area offers anything like it.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-[#f2eee9] rounded-3xl p-8 text-[#4a3f3c]">
              <div className="text-sm uppercase tracking-wide text-[#a08b84] mb-2">{desk.name}</div>
              <div className="text-5xl font-bold font-serif text-[#735e59] mb-2">
                {desk.includedHoursPerMonth}
              </div>
              <div className="text-[#6b5f5b]">included venue hours per month</div>
            </div>
            <div className="bg-[#f2eee9] rounded-3xl p-8 text-[#4a3f3c] ring-4 ring-[#f2eee9]/30">
              <div className="text-sm uppercase tracking-wide text-[#a08b84] mb-2">{office.name}</div>
              <div className="text-5xl font-bold font-serif text-[#735e59] mb-2">
                {office.includedHoursPerMonth}
              </div>
              <div className="text-[#6b5f5b]">included venue hours per month</div>
            </div>
          </div>
          <p className="text-[#f2eee9]/70 text-sm mt-8">
            Twice the included hours on a private office; the upgrade pays for itself if you teach
            weekly.
          </p>
        </div>
      </section>

      {/* Section 1: basement studio at Merritt Wellness */}
      <section className="py-16 bg-[#faf8f5]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-4">
              In the church
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif">
              The basement studio
            </h2>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-lg">
            <p className="text-[#6b5f5b] leading-relaxed mb-4">
              On the lower level of the church, a private flex studio suited to one-on-one work:
              somatic and talk therapy, bodywork, coaching, small movement sessions. Your own
              door, your own hours, inside a building that clients remember, with the cafe lounge
              upstairs for before and after.
            </p>
            <p className="text-[#6b5f5b] leading-relaxed mb-6">
              The studio rents on a monthly basis and is currently fully booked. Spots turn over
              as practitioners grow into bigger rooms next door, so the waitlist is genuinely how
              the next tenant gets the space.
            </p>
            <a
              href="#waitlist"
              className="inline-block bg-[#735e59] text-[#f2eee9] font-semibold px-8 py-4 rounded-full hover:bg-[#5a4a46] transition-colors duration-200"
            >
              Be first in line
            </a>
          </div>
        </div>
      </section>

      {/* Section 2: private offices & studios at Merritt Workspace */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-4">
              Next door at {VENUE.workspaceName}
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif">
              Private offices &amp; studios
            </h2>
          </div>
          <div className="bg-[#faf8f5] rounded-3xl p-8 border border-[#735e59]/10">
            <p className="text-[#6b5f5b] leading-relaxed mb-6">
              The adjacent coworking building offers private offices and private studios for
              practitioners and small businesses: your own lockable room, a professional address,
              and neighbors who are also building something. It is the natural next step when a
              desk or the basement studio starts feeling small, and it carries the{' '}
              {office.includedHoursPerMonth} included monthly venue hours.
            </p>
            <a
              href={VENUE.workspaceUrl}
              className="inline-block bg-[#735e59] text-[#f2eee9] font-semibold px-8 py-4 rounded-full hover:bg-[#5a4a46] transition-colors duration-200"
            >
              Current availability at merrittworkspace.net
            </a>
          </div>
        </div>
      </section>

      {/* Section 3: dedicated desks */}
      <section className="py-16 bg-[#f2eee9]/60">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-4">
              Next door at {VENUE.workspaceName}
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif">
              Dedicated desks
            </h2>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm">
            <p className="text-[#6b5f5b] leading-relaxed mb-6">
              The entry point for solo practitioners: a desk that is yours, in a building full of
              people doing focused work, at the lowest monthly commitment. It comes with{' '}
              {desk.includedHoursPerMonth} included venue hours a month in the church next door,
              which is enough to run a weekly session or a monthly workshop without renting a
              studio anywhere.
            </p>
            <a
              href={VENUE.workspaceUrl}
              className="inline-block border-2 border-[#735e59]/40 text-[#735e59] font-semibold px-8 py-4 rounded-full hover:bg-[#735e59] hover:text-[#f2eee9] transition-all duration-200"
            >
              Desk details at merrittworkspace.net
            </a>
          </div>
        </div>
      </section>

      {/* Cross-link to class partnerships */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[#6b5f5b] leading-relaxed">
            Teaching a regular class rather than seeing clients?{' '}
            <Link href="/class-partnerships" className="text-[#735e59] font-semibold underline underline-offset-4 hover:text-[#5a4a46]">
              Recurring class partnerships
            </Link>{' '}
            publish open weekly blocks in the main hall, with partner pricing.
          </p>
        </div>
      </section>

      {/* Waitlist capture */}
      <div id="waitlist">
        <InquirySection
          variant="waitlist"
          eventType="Basement studio waitlist"
          heading="Basement studio waitlist"
          intro="The studio is currently fully booked. Leave your details and desired start window and we will reach out in order when it opens."
        />
      </div>
    </main>
  );
}
