import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import Gallery from '@/components/venue/Gallery';
import InquiryForm from '@/components/venue/InquiryForm';
import { venueJsonLd } from '@/lib/venue-schema';
import { venueImages, congregationsImages } from '@/app/data/venue-images';
import { sundaySchedule, specs, contact } from '@/app/data/site';
import { Check } from 'lucide-react';

const PATH = '/congregations';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/venue/og-venue.jpg';

export const metadata: Metadata = {
  title: 'A Home for Your Congregation in Denver | Merritt Wellness',
  description:
    'A 1905 church in Denver open to congregations and spiritual communities of every tradition. Two churches already meet here on Sundays; daytime and Sunday evening slots remain. Flat monthly rates, non-profit discount, sound system and parking included.',
  keywords:
    'church space for rent Denver, congregation meeting space Denver, worship space rental Denver, interfaith meeting space Denver, spiritual community venue Denver, church without a building Denver',
  openGraph: {
    title: 'A Home for Your Congregation in Denver | Merritt Wellness',
    description:
      'A 1905 sanctuary open to gatherings of every tradition. Two churches meet here now; there is room for more.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: venueImages.mainHallRoseWindow.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Home for Your Congregation in Denver',
    description:
      'A 1905 sanctuary open to gatherings of every tradition. Two churches meet here now; there is room for more.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

const included = [
  `Sanctuary seating for up to ${specs.capacity}, cathedral ceilings, original stained glass, hardwood floors`,
  'Surround sound system, projector, and screen already installed',
  `${specs.parkingSpots} on-site parking spots`,
  'Cafe lounge and breakout rooms for fellowship, childcare, and classes',
  'Flat monthly rate, not hourly billing',
];

export default function CongregationsPage() {
  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Congregation Partnerships',
              description:
                'A restored 1905 church in Denver hosting congregations and spiritual communities of every tradition, with Sunday and weekday availability.',
              images: [congregationsImages.sundayService.src, venueImages.sunlitHallPartition.src, congregationsImages.communityCircle.src],
            })
          ),
        }}
      />

      {/* A real Sunday service, not an empty room: Pastor Tate mid-sermon
          with an interpreter beside him. The people sit in the lower half of
          the frame, so bias the crop there. */}
      <PageHero
        image={congregationsImages.sundayService}
        imageClassName="object-[center_62%]"
        eyebrow="Faith & Community Gatherings"
        title={
          <>
            A Sanctuary,
            <span className="block font-bold">Still Doing Its Work</span>
          </>
        }
        subtitle="Built in 1905 for a congregation. Two meet here every Sunday now, and there is room for more."
        ctas={[{ label: 'Talk Through Fit', href: '#inquiry' }]}
      />

      {/* The framing: history and openness held together */}
      <section className="pt-14 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center">
            <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
              A sanctuary since 1905
            </span>
            <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-8">
              120 years of people gathering here
            </h2>
          </div>
          <div className="space-y-6 text-lg text-[#6b5f5b] leading-relaxed">
            <p>
              This building was raised as a Methodist church in 1905 and spent more than a
              century doing exactly what it was built for. The cathedral ceilings, the rose
              window, the worn-smooth hardwood: none of it is decoration. It is what a
              building looks like when generations of people have gathered in it, week after
              week, for the things that mattered most to them.
            </p>
            <p>
              Merritt Wellness runs the building today as a non-denominational venue, and a
              century of gathering turns out to prepare a room for many kinds of gathering.
              Two Christian churches hold Sunday services here now. The same hall holds
              meditation and contemplative practice, grief and recovery circles, and cultural
              and spiritual communities of traditions the original builders never imagined.
              The room does not ask anyone to be something they are not. It just holds people
              well, the way it always has.
            </p>
            <p>
              If your community is looking for a home, whether you are between buildings,
              outgrowing a living room, or starting something new, we would like to meet you.
            </p>
          </div>
        </div>
      </section>

      {/* Who's here now + Sunday schedule */}
      <section className="py-24 bg-white/60">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-6">
            Sundays here today
          </h2>
          <p className="text-[#6b5f5b] leading-relaxed max-w-3xl mb-10">
            Two churches currently hold their Sunday services here, between{' '}
            {sundaySchedule.serviceWindow}. We think that matters to anyone considering the
            space: you would be joining a building that already carries an active life of
            worship, with neighbors who understand what Sunday means. The building holds{' '}
            {sundaySchedule.daytimeSlots} daytime congregation slots, so one remains open, and
            the hall is fully available on {sundaySchedule.eveningAvailability.toLowerCase()}.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm text-center">
              <p className="text-3xl font-bold text-[#735e59] font-serif">{sundaySchedule.communitiesInResidence}</p>
              <p className="text-[#6b5f5b] mt-1 text-sm">churches in residence on Sundays</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm text-center">
              <p className="text-3xl font-bold text-[#735e59] font-serif">
                {sundaySchedule.daytimeSlots - sundaySchedule.communitiesInResidence}
              </p>
              <p className="text-[#6b5f5b] mt-1 text-sm">daytime Sunday slot open now</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm text-center">
              <p className="text-3xl font-bold text-[#735e59] font-serif">4:30 PM</p>
              <p className="text-[#6b5f5b] mt-1 text-sm">Sunday evenings open after this</p>
            </div>
          </div>
        </div>
      </section>

      {/* What a partnership includes */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-10">
            What a partnership includes
          </h2>
          <ul className="grid sm:grid-cols-2 gap-4 mb-10">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 bg-white rounded-2xl px-6 py-5 border border-[#735e59]/10">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#735e59]/10 text-[#735e59] shrink-0 mt-0.5">
                  <Check size={16} />
                </span>
                <span className="text-[#4a3f3c]">{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm">
            <h3 className="font-bold text-[#735e59] font-serif text-lg mb-3">
              About the rate
            </h3>
            <p className="text-[#6b5f5b] leading-relaxed text-sm">
              Congregation partnerships are a flat monthly rate built around your schedule,
              not an hourly meter. Every community's rhythm is different, so we do not
              publish a number here; we will put a real figure on your specific schedule
              during the walkthrough.
            </p>
          </div>
          <p className="mt-8 text-[#6b5f5b] leading-relaxed text-sm">
            One practical note: the front entrance has ramp access, and the main hall
            restrooms are downstairs and not ADA accessible. ADA restrooms are available next
            door at Merritt Workspace.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <Gallery
            heading="The Building"
            images={[
              congregationsImages.communityCircle,
              venueImages.mainHallRoseWindow,
              venueImages.hallProjectionScreen,
              venueImages.cafeLounge,
              venueImages.seatedSemicircle,
              venueImages.exteriorSummer,
            ]}
          />
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="congregation"
            page={PATH}
            heading="Talk Through Fit"
            subheading="Tell us about your community: tradition, size, and the rhythm of your gatherings. We will reply personally and set up a walkthrough."
            showEventFields={false}
            showStartWindow
            submitLabel="Reach Out"
            successMessage="Thank you. Finding the right home for a community is worth a real conversation, and we will reply personally, usually within one business day."
          />
          <p className="text-center text-sm text-[#a08b84] mt-6">
            Or call {contact.inquiries.phone}. No pitch, just a walkthrough and honest answers
            about whether the space serves your community.
          </p>
        </div>
      </section>
    </main>
  );
}
