import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getBlurDataURL } from '@/lib/blur-data';
import PageHero from '@/components/venue/PageHero';
import SpecsBlock from '@/components/venue/SpecsBlock';
import AmenitiesBlock from '@/components/venue/AmenitiesBlock';
import PoliciesBlock from '@/components/venue/PoliciesBlock';
import RateTable from '@/components/venue/RateTable';
import InquiryForm from '@/components/venue/InquiryForm';
import CoPromotionBlock from '@/components/venue/CoPromotionBlock';
import { venueJsonLd } from '@/lib/venue-schema';
import { venueImages, weddingsImages, artShowsImages, concertsImages } from '@/app/data/venue-images';
import { eventTypes } from '@/app/data/site';
import { extendedDiscount, cardFeePercent, addOns } from '@/app/lib/venue-rates';
import { ArrowRight } from 'lucide-react';

const PATH = '/private-events';
const OG_IMAGE = 'https://merrittwellness.net/images/pages/venue/og-venue.jpg';

export const metadata: Metadata = {
  title: 'Private Event Venue in Denver | Historic 1905 Church | Merritt Wellness',
  description:
    'Rent a restored 1905 church in Denver for private events: celebrations of life, memorials, parties, quinceañeras, birthdays, showers, graduations, and corporate offsites. Up to 125 guests, real pricing, 22 parking spots.',
  keywords:
    'private event venue Denver, event space rental Denver, celebration of life venue Denver, party venue Denver, quinceañera venue Denver, corporate offsite Denver, memorial service venue Denver',
  openGraph: {
    title: 'Private Event Venue in Denver | Merritt Wellness',
    description:
      'A restored 1905 church near Sloans Lake for celebrations, memorials, milestones, and offsites. Up to 125 guests.',
    url: `https://merrittwellness.net${PATH}`,
    siteName: 'Merritt Wellness',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: venueImages.mainHallRoseWindow.alt }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Private Event Venue in Denver | Merritt Wellness',
    description:
      'A restored 1905 church near Sloans Lake for celebrations, memorials, milestones, and offsites. Up to 125 guests.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `https://merrittwellness.net${PATH}` },
};

// Card images for event types that have dedicated pages.
const typeImages: Record<string, { src: string; alt: string }> = {
  weddings: weddingsImages.celebrationKiss,
  concerts: concertsImages.songwritersRound,
  'art-shows': artShowsImages.exhibitionStainedGlass,
};

export default function PrivateEventsPage() {
  const linked = eventTypes.filter((t) => t.href);
  const unlinked = eventTypes.filter((t) => !t.href);

  return (
    <main className="bg-[#faf8f5] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            venueJsonLd({
              path: PATH,
              name: 'Merritt Wellness — Private Event Venue',
              description:
                'Restored 1905 church event venue in Denver for private events of up to 125 guests: weddings, concerts, art shows, celebrations of life, parties, and corporate offsites.',
              images: [venueImages.sunlitHall.src, venueImages.exteriorFront.src, venueImages.seatedSemicircle.src],
            })
          ),
        }}
      />

      {/* Hero */}
      <PageHero
        image={venueImages.sunlitHall}
        eyebrow="Events at Merritt"
        title={
          <>
            One Historic Room,
            <span className="block font-bold">Every Kind of Gathering</span>
          </>
        }
        subtitle="A restored 1905 church in Sloans Lake with cathedral ceilings, stained glass, and space for up to 125 guests."
        ctas={[
          { label: 'Check Availability & Book', href: '/book' },
          { label: 'Ask About Your Event', href: '#inquiry', variant: 'ghost' },
        ]}
      />

      {/* Event types */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            What people host here
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-[#4a3f3c] font-serif mb-6">
            Built for gathering, whatever the occasion
          </h2>
          <p className="text-[#6b5f5b] leading-relaxed max-w-3xl mb-14">
            The hall has spent 120 years holding the moments that matter to people. Today that
            means weddings and concerts, and just as often celebrations of life, memorial
            services, quinceañeras, birthday parties, baby and bridal showers, graduation
            parties, and corporate offsites. If it involves people gathering with intention,
            the room already knows how to hold it. Host it privately or open the doors to
            the public; that choice is yours, made booking by booking.
          </p>

          {/* Types with dedicated pages */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {linked.map((type) => {
              const img = typeImages[type.key];
              return (
                <Link
                  key={type.key}
                  href={type.href!}
                  className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl border border-[#735e59]/10 hover:-translate-y-2 transition-all duration-300"
                >
                  {img && (
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        placeholder={getBlurDataURL(img.src) ? 'blur' : 'empty'}
                        blurDataURL={getBlurDataURL(img.src)}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-8">
                    <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-2">{type.title}</h3>
                    <p className="text-[#6b5f5b] text-sm leading-relaxed mb-4">{type.description}</p>
                    <span className="inline-flex items-center gap-2 text-[#735e59] font-semibold text-sm">
                      Explore {type.title.toLowerCase()}
                      <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Types covered here until they get their own pages */}
          <div className="grid md:grid-cols-3 gap-6">
            {unlinked.map((type) => (
              <div key={type.key} className="bg-white rounded-3xl p-8 shadow-sm border border-[#735e59]/10">
                <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-2">{type.title}</h3>
                <p className="text-[#6b5f5b] text-sm leading-relaxed">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Co-promotion for public events */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <CoPromotionBlock />
        </div>
      </section>

      {/* Specs */}
      <section className="py-16 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <SpecsBlock heading="Capacity & Spaces" />
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">Full Pricing</h2>
          <p className="text-[#6b5f5b] mb-10 max-w-2xl">
            Hourly rates by day and guest count. Book {extendedDiscount.minHours} or more hours
            and a {extendedDiscount.percent}% discount applies automatically.
          </p>
          <RateTable />
          <div className="mt-10">
            <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-4">Optional add-ons</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {addOns.map((addon) => (
                <div key={addon.name} className="bg-white rounded-2xl px-6 py-5 border border-[#735e59]/10">
                  <p className="font-semibold text-[#4a3f3c]">{addon.name}</p>
                  <p className="text-sm text-[#6b5f5b] mt-1">{addon.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-[#a08b84]">
              Pay by bank transfer at no extra cost, or by card with a {cardFeePercent}% processing
              fee. Everything is itemized on the booking page before you pay.
            </p>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-6">
          <AmenitiesBlock />
        </div>
      </section>

      {/* Policies */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <PoliciesBlock heading="Policies, All in One Place" />
        </div>
      </section>

      {/* Inquiry form */}
      <section id="inquiry" className="py-24 bg-white/60">
        <div className="max-w-3xl mx-auto px-6">
          <InquiryForm
            kind="event"
            page={PATH}
            heading="Tell Us About Your Event"
            subheading="Every event listed above starts with the same short note. Tell us what you are planning, or ask to come see the room; we will reply with availability, usually within one business day."
          />
        </div>
      </section>

    </main>
  );
}
