import type { Metadata } from 'next';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import AmenitiesBlock from '@/components/venue/AmenitiesBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import Gallery from '@/components/venue/Gallery';
import FaqSection from '@/components/venue/FaqSection';
import InquiryForm from '@/components/venue/InquiryForm';
import RateTable from '@/components/venue/RateTable';
import { venueJsonLd, faqJsonLd, type Faq } from '@/lib/venue-schema';
import { venueImages, weddingsImages } from '@/app/data/venue-images';
import {
  extendedDiscount,
  minimumHours,
  cardFeePercent,
  money,
  saturdayExample,
} from '@/app/lib/venue-rates';

const PATH = '/weddings';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/weddings/og-weddings.jpg';

export const metadata: Metadata = {
  title: 'Denver Wedding Venue in a Restored 1905 Sanctuary | Merritt Wellness',
  description:
    'Historic Denver wedding venue near Sloans Lake: a restored 1905 sanctuary with 24-foot vaulted ceilings, original stained glass, and room for up to 125 guests. Saturday weddings, real pricing, tours by appointment.',
  keywords:
    'Denver wedding venue, historic wedding venue Denver, sanctuary wedding venue Denver, small wedding venue Denver, Sloans Lake wedding venue, intimate wedding venue Colorado',
  openGraph: {
    title: 'Denver Wedding Venue in a Restored 1905 Sanctuary | Merritt Wellness',
    description:
      'Vaulted ceilings, original stained glass, and room for 125 guests in Sloans Lake. Real pricing, no mystery quotes.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 1080, height: 567, alt: weddingsImages.celebrationKiss.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Denver Wedding Venue in a Restored 1905 Sanctuary',
    description:
      'Vaulted ceilings, original stained glass, and room for 125 guests in Sloans Lake. Real pricing, no mystery quotes.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

const faqs: Faq[] = [
  {
    question: 'How many guests can the venue hold?',
    answer:
      'Up to 125 guests. The main hall is about 1,100 square feet, with roughly 2,400 square feet across the full building including the upstairs, cafe lounge, and breakout rooms.',
  },
  {
    question: 'What days can we book our wedding?',
    answer:
      'Weddings are hosted on Saturdays, so the building belongs to one celebration at a time. Friday and Sunday evening weddings starting at 4 PM or later are also available (Sunday services wrap by 4:30 PM), and they bill at the lower Sunday-to-Friday rate. For any other date or time, like a full Friday wedding day, reach out and we will talk through whether it can work.',
  },
  {
    question: 'Can we hold both the ceremony and the reception here?',
    answer:
      'Yes. Most couples hold the ceremony in the main hall, move guests to the cafe lounge during the turnover, and return to the hall for the reception. The breakout rooms give caterers and vendors space to stage.',
  },
  {
    question: 'Can we bring our own alcohol?',
    answer:
      'Yes, BYOB is welcome. Any event with alcohol needs a certificate of general liability insurance, and if alcohol is being served it must be served by a TIPS-certified bartender. Alcohol cannot be sold on premises.',
  },
  {
    question: 'Are tables and chairs included?',
    answer:
      'No. Most couples bring in a rental company for tables, chairs, and linens, which also gives you exactly the look you want. Delivery and pickup need to happen within your booked rental window.',
  },
  {
    question: 'What time do events end?',
    answer:
      'Events end by 10 PM, in line with Denver neighborhood ordinances. Setup and breakdown happen within your booked rental window, so build both into the hours you reserve.',
  },
  {
    question: 'Is there parking?',
    answer:
      'There are 22 on-site parking spots, plus street parking in the surrounding Sloans Lake neighborhood.',
  },
  {
    question: 'Is the venue wheelchair accessible?',
    answer:
      'The front entrance has ramp access and the main hall is on the entry level. Main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at Merritt Workspace.',
  },
  {
    question: 'Is there a place to get ready?',
    answer:
      'Yes. The downstairs suite works well for getting ready with your wedding party before the ceremony, and it photographs beautifully.',
  },
  {
    question: 'Can we play amplified music or bring a band?',
    answer:
      'Yes. A surround sound system is built in, and live bands are welcome. The on-site mixer is available to professional sound techs only, so plan for your band or DJ to bring their own engineer or gear.',
  },
  {
    question: 'How do we see the space and hold a date?',
    answer:
      'Reach out through the form below, call, or email and we will set up a tour. Dates are held once a booking is confirmed through our booking page.',
  },
];

const galleryImages = [
  venueImages.mainHallRoseWindow,
  weddingsImages.aisleRecessional,
  weddingsImages.cakeTableCouple,
  weddingsImages.headTableCake,
  weddingsImages.gettingReady,
  venueImages.sunlitHall,
];

export default function WeddingsPage() {
  const example = saturdayExample(10, 100);

  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Wedding Venue',
              description:
                'Historic Denver wedding venue in a restored 1905 sanctuary near Sloans Lake, with 24-foot vaulted ceilings, original stained glass, and capacity for 125 guests.',
              images: [
                venueImages.mainHallRoseWindow.src,
                weddingsImages.celebrationKiss.src,
                venueImages.exteriorFront.src,
              ],
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PATH, faqs)) }}
      />

      {/* 1. Hero — the full wedding party cheering the kiss. The people live
          in the lower two-thirds of the frame, so bias the crop there. */}
      <PageHero
        image={weddingsImages.celebrationKiss}
        imageClassName="object-[center_75%]"
        eyebrow="Weddings at Merritt"
        title={
          <>
            A Denver Wedding Venue
            <span className="block font-bold">Inside a 1905 Sanctuary</span>
          </>
        }
        subtitle="Vaulted ceilings, original stained glass, and one room your guests will never forget. Sloans Lake, ten minutes from downtown."
        ctas={[
          { label: 'Check Availability & Book', href: '/book' },
          { label: 'Schedule a Tour', href: '#inquiry', variant: 'ghost' },
        ]}
      />

      {/* 2. Positioning */}
      <section className="pt-14 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            Why couples choose Merritt
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-8">
            The room is the decor
          </h2>
          <p className="text-lg md:text-xl text-[#6b5f5b] leading-relaxed">
            This is an intact 1905 sanctuary: 24-foot vaulted ceilings, original stained
            glass, and hardwood floors that have held a century of gatherings. It photographs
            beautifully as it stands, so you can spend your budget on the people and the party
            instead of transforming a blank box.
          </p>
        </div>
      </section>

      {/* When weddings happen — Saturdays, with Friday/Sunday evening exceptions */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#735e59]/10 shadow-sm text-center">
            <h2 className="text-2xl md:text-3xl font-light text-[#4a3f3c] font-serif mb-4">
              Weddings here are <span className="font-bold">Saturday celebrations</span>
            </h2>
            <p className="text-[#6b5f5b] leading-relaxed max-w-2xl mx-auto">
              We host weddings on Saturdays, so the building and our full attention belong to
              one celebration. Friday and Sunday evening weddings starting at 4 PM or later
              can work beautifully too, and they bill at the lower Sunday-to-Friday rate.
              Have a different date or time in mind, like a full Friday wedding day? Reach
              out and we will talk it through.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Specs */}
      <section className="py-16 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <SpecsBlock heading="The Space, By the Numbers" />
        </div>
      </section>

      {/* 4. Gallery */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Gallery
            heading="Weddings in the Hall"
            subheading="Real weddings, no staging."
            images={galleryImages}
          />
        </div>
      </section>

      {/* 5. What's included */}
      <section className="py-24 bg-white/60">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-10">
            What Your Rental Includes
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-[#4a3f3c]">
            {[
              'Exclusive use of the main hall for your booked window',
              'Cafe lounge for cocktail hour and mingling',
              'Breakout rooms for vendors, staging, and quiet moments',
              'Downstairs getting-ready space',
              'Surround sound system and projector',
              'Air conditioning',
              '22 on-site parking spots',
              'Time for setup and breakdown within your window',
            ].map((item) => (
              <p key={item} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#735e59] shrink-0" />
                {item}
              </p>
            ))}
          </div>
          <p className="mt-8 text-[#6b5f5b] leading-relaxed">
            Tables and chairs are not included. Most couples bring in a rental company for
            tables, chairs, and linens, which also gives you full control of the look.
          </p>
        </div>
      </section>

      {/* 6. Pricing */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">
            Pricing, Out in the Open
          </h2>
          <p className="text-[#6b5f5b] mb-10 max-w-2xl">
            Hourly rates by day and guest count, with a {minimumHours}-hour minimum. No
            packages to decode, no quote-request wall.
          </p>
          <RateTable />
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm">
              <h3 className="font-bold text-[#735e59] font-serif text-lg mb-3">
                Booking {extendedDiscount.minHours}+ hours saves {extendedDiscount.percent}%
              </h3>
              <p className="text-[#6b5f5b] text-sm leading-relaxed">
                A full wedding day qualifies automatically. Example: {example.hours} hours on a
                Saturday for 100 guests is {money(example.base)} at {money(example.rate)}/hour;
                the {extendedDiscount.percent}% discount takes off {money(example.discount)},
                bringing it to {money(example.total)}.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-[#735e59]/10 shadow-sm">
              <h3 className="font-bold text-[#735e59] font-serif text-lg mb-3">Payment</h3>
              <p className="text-[#6b5f5b] text-sm leading-relaxed">
                Pay by bank transfer at no extra cost, or by card with a {cardFeePercent}%
                processing fee. Optional add-ons like our in-house tables and chairs or event
                staffing are itemized on the booking page before you pay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Amenities */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <AmenitiesBlock heading="Amenities Your Guests Will Notice" />
        </div>
      </section>

      {/* 8. Policies */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <PoliciesBlock heading="The Practical Details" />
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <FaqSection faqs={faqs} heading="Wedding Questions, Answered" />
        </div>
      </section>

      {/* Inquiry form */}
      <section id="inquiry" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="event"
            page={PATH}
            heading="Tell Us About Your Wedding"
            subheading="Share what you are planning, or just ask for a tour; photos carry the ceilings and stained glass only so far. We reply with availability and next steps, usually within one business day."
            defaultEventType="Wedding"
            submitLabel="Send Wedding Inquiry"
          />
        </div>
      </section>

    </main>
  );
}
