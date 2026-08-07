import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/venue/PageHero';
import InquiryForm from '@/components/venue/InquiryForm';
import { venueJsonLd } from '@/lib/venue-schema';
import { venueImages } from '@/app/data/venue-images';
import { workspace, workspaceMemberHours, contact } from '@/app/data/site';
import { ArrowRight } from 'lucide-react';

const PATH = '/studio';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/venue/exterior-front.webp';

export const metadata: Metadata = {
  title: 'Studio & Workspace for Practitioners | Merritt Wellness Denver',
  description:
    'Studio and workspace options for Denver practitioners: the Merritt Wellness flex studio waitlist, private offices and studios at Merritt Workspace next door, and dedicated desks with included venue hours in the 1905 church hall.',
  keywords:
    'practitioner studio Denver, wellness studio space Denver, coworking for practitioners Denver, private office Sloans Lake, dedicated desk Denver, therapy office Denver',
  openGraph: {
    title: 'Studio & Workspace for Practitioners | Merritt Wellness Denver',
    description:
      'An office next door, a 1905 church hall for your sessions, included with membership. Studio waitlist open.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 2048, height: 1142, alt: venueImages.exteriorFront.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Studio & Workspace for Practitioners | Merritt Wellness Denver',
    description:
      'An office next door, a 1905 church hall for your sessions, included with membership. Studio waitlist open.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

export default function StudioPage() {
  const [desk, office] = workspaceMemberHours.tiers;

  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Studio & Workspace',
              description:
                'Studio and workspace options for practitioners: flex studio at Merritt Wellness and offices, studios, and dedicated desks at Merritt Workspace next door.',
              images: [venueImages.exteriorFront.src, venueImages.cafeLounge.src],
            })
          ),
        }}
      />

      <PageHero
        image={venueImages.exteriorFront}
        eyebrow="Studio & Workspace"
        title={
          <>
            Two Buildings,
            <span className="block font-bold">One Home for Your Practice</span>
          </>
        }
        subtitle="The 1905 church and Merritt Workspace stand side by side in Sloans Lake. Between them: studios, offices, desks, and a hall your clients will remember."
        ctas={[
          { label: 'Join the Studio Waitlist', href: '#waitlist' },
          { label: 'See Member Benefits', href: '#member-benefit', variant: 'ghost' },
        ]}
      />

      {/* 1. Basement flex studio — waitlist */}
      <section className="pt-14 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Photo intentionally omitted: the flex studio, desk, and office
              sections get their photo set together once all three shots exist. */}
          <div className="max-w-3xl mx-auto">
            <div>
              <div className="text-center">
                <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                  At Merritt Wellness
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-6">
                  The <span className="font-bold">Flex Studio</span>
                </h2>
              </div>
              <div className="space-y-4 text-[#6b5f5b] leading-relaxed">
                <p>
                  In the basement of the building, beneath the main hall, sits a stone-walled
                  flex studio: a very private, quiet room that practitioners love for
                  bodywork, coaching, small-group sessions, and any practice that wants a
                  door that closes. Renters get scheduled access on a recurring monthly
                  arrangement, with the building's parking and lounge around them.
                </p>
                <p>
                  Every room in the basement is spoken for right now, and the practitioners
                  who hold them tend to stay. The{' '}
                  <a href="#waitlist" className="underline decoration-[#735e59]/40 hover:text-[#735e59]">
                    waitlist below
                  </a>{' '}
                  is how the next room changes hands: when one opens, we go down the list in
                  order, and the conversation starts with the person at the top.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Private offices & studios at Merritt Workspace */}
      <section className="py-24 bg-white/60">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-6">
            Private Offices & Studios Next Door
          </h2>
          <p className="text-[#6b5f5b] leading-relaxed max-w-3xl mb-8">
            {workspace.name} is the coworking property directly next door, run by the same
            family. Practitioners and small businesses take private offices and private
            studios there: your own key, your own room, a real business address, and the
            church hall a few steps away when a session needs more space than an office.
            Inventory and current pricing live on their site, which stays up to date as rooms
            turn over.
          </p>
          <Link
            href={workspace.url}
            className="inline-flex items-center gap-2 bg-[#735e59] text-[#f2eee9] font-bold px-8 py-4 rounded-full shadow-lg hover:bg-[#5a4a46] hover:-translate-y-1 transition-all duration-300"
          >
            See Offices & Studios at {workspace.name}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 3. Dedicated desks + THE member benefit */}
      <section id="member-benefit" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-6">
              A desk next door.
              <span className="block font-bold">A cathedral included.</span>
            </h2>
            <p className="text-lg text-[#6b5f5b] leading-relaxed max-w-3xl mx-auto">
              {workspace.name} members can book the Merritt Wellness hall at no additional
              cost, {workspaceMemberHours.window}. Run your client sessions, workshops, or
              classes under 24-foot ceilings and stained glass, included with the membership
              that already gives you your desk. No other coworking space in the area offers
              anything like it.
            </p>
          </div>

          {/* The two tiers, side by side and legible at a glance */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-10 border border-[#735e59]/10 shadow-lg text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#a08b84] mb-4">{desk.name}</p>
              <p className="text-6xl font-bold text-[#735e59] font-serif">{desk.hoursPerMonth}</p>
              <p className="text-[#6b5f5b] mt-2 mb-6">included venue hours per month</p>
              <p className="text-sm text-[#6b5f5b] leading-relaxed">
                The entry point for solo practitioners: a dedicated desk at {workspace.name}{' '}
                plus a weekly session's worth of hall time.
              </p>
            </div>
            <div className="bg-[#735e59] rounded-3xl p-10 shadow-xl text-center relative overflow-hidden">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#f2eee9]/70 mb-4">{office.name}</p>
              <p className="text-6xl font-bold text-[#f2eee9] font-serif">{office.hoursPerMonth}</p>
              <p className="text-[#f2eee9]/80 mt-2 mb-6">included venue hours per month</p>
              <p className="text-sm text-[#f2eee9]/85 leading-relaxed">
                Double the hall time: enough for a weekly class or twice-monthly workshops,
                with a private office behind your own door.
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-[#a08b84] mt-8">
            Membership details and current desk availability are on{' '}
            <Link href={workspace.url} className="underline hover:text-[#735e59]">
              {workspace.url.replace('https://', '')}
            </Link>
            . Questions about how the venue hours work? Email{' '}
            <a href={`mailto:${contact.inquiries.email}`} className="underline hover:text-[#735e59]">
              {contact.inquiries.email}
            </a>
            .
          </p>
        </div>
      </section>

      {/* Flex studio waitlist — kept at the bottom so the page reads before it asks */}
      <section id="waitlist" className="py-24 bg-white/60">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="waitlist"
            page={PATH}
            heading="Be First in Line"
            subheading="The flex studio waitlist: name, email, and when you would want to start. We work the list in order when a room opens."
            showEventFields={false}
            showStartWindow
            submitLabel="Join the Waitlist"
            successMessage="You're on the list. When a studio opens, we reach out in the order inquiries came in."
          />
        </div>
      </section>
    </main>
  );
}
