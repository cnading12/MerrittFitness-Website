'use client';

import EnhancedGallery from "@/components/EnhancedGallery";
import PageHero from "@/components/venue/PageHero";
import FaqSection from "@/components/venue/FaqSection";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getBlurDataURL } from "@/lib/blur-data";
import { Landmark, Sun, HeartHandshake, Music2, Star } from "lucide-react";
import { faqJsonLd, type Faq } from "@/lib/venue-schema";
import { jsonLdScript } from "@/lib/site-schema";
import { rateBands, money, recurringDiscount, minimumHours } from "@/app/lib/venue-rates";
import { contact, specs, reviews, maps } from "@/app/data/site";
import {
  venueImages,
  weddingsImages,
  concertsImages,
  artShowsImages,
  classesImages,
  congregationsImages,
} from "@/app/data/venue-images";

// The six doors into the venue — same list, same order as the Events menu.
const homeEventTypes = [
  {
    label: "Weddings",
    href: "/weddings",
    image: weddingsImages.celebrationKiss,
    description: "Ceremonies and receptions under the rose window, for up to 125 guests.",
  },
  {
    label: "Concerts & Performances",
    href: "/concerts",
    image: concertsImages.songwritersRound,
    description: "A hall shaped for sound, with the surround system already in the room.",
  },
  {
    label: "Art Shows & Exhibitions",
    href: "/art-shows",
    image: artShowsImages.visitorsBrowsing,
    description: "Natural light and century-old walls that let the work carry the room.",
  },
  {
    label: "Wellness & Movement Classes",
    href: "/class-partnerships",
    image: classesImages.breathworkClass,
    description: "Yoga, breathwork, sound baths, dance, and martial arts, all week long.",
  },
  {
    label: "Faith & Community Gatherings",
    href: "/congregations",
    image: congregationsImages.communityCircle,
    description: "A sanctuary since 1905, open to communities of every tradition.",
  },
  {
    label: "All Private Events",
    href: "/private-events",
    image: venueImages.sunlitHall,
    description: "Celebrations of life, parties, quinceañeras, showers, and offsites, with published pricing.",
  },
];

// Site-wide FAQ, shown on the homepage AND emitted as the site's only
// FAQPage node (the event-type pages carry their own, scoped to their path).
//
// These are ONE array feeding both the visible accordion and the JSON-LD, on
// purpose: Google requires FAQ markup to match content a visitor can actually
// see on the page. This block used to be schema-only, with no FAQ rendered
// anywhere — an orphaned-markup violation — and its answers described a
// yoga-only studio at a flat "$95/hour", which is neither what the venue is
// nor what it charges. Every figure below now comes from the booking
// engine's own constants via venue-rates.
const faqs: Faq[] = [
  {
    question: 'What kinds of events can you host at Merritt Wellness?',
    answer: `Weddings, private events, concerts and performances, art shows, faith and community gatherings, and wellness and movement classes. The building is a restored ${specs.built} sanctuary in Denver's Sloans Lake neighborhood holding up to ${specs.capacity} guests, and it is booked for everything from a Saturday wedding to a standing Tuesday yoga class to a celebration of life. Rates are published, so you can price your event without waiting on a quote.`,
  },
  {
    question: 'Can I teach a weekly yoga, dance, or movement class there?',
    answer: `Yes — recurring class partnerships are one of the main things the venue does. Instructors hold a standing weekly block in the main hall for yoga, breathwork, sound baths, dance, martial arts, and more. Bookings of ${recurringDiscount.minMonthlyHours} or more hours a month get ${recurringDiscount.percent}% off every hour and simple monthly billing, so a weekly block runs ${money(rateBands[0].weekdayRecurring)} an hour. The hall has a full-coverage roll-out floor mat, ${specs.mirrorFeet} feet of rollaway mirrors, and a house sound system. See merrittwellness.net/class-partnerships.`,
  },
  {
    question: 'How much does it cost to rent the venue in Denver?',
    answer: `Hourly, by guest count and day. Sunday through Friday: ${rateBands
      .map((band) => `${money(band.weekday)} for ${band.guests.toLowerCase()}`)
      .join(', ')}. Saturdays: ${rateBands
      .map((band) => `${money(band.saturday)} for ${band.guests.toLowerCase()}`)
      .join(', ')}. There is a ${minimumHours}-hour minimum, setup and breakdown happen inside your booked window, and longer bookings and recurring partners earn further discounts.`,
  },
  {
    question: 'Where can I find sound baths, breathwork, and yoga classes in Denver?',
    answer: `Merritt Wellness hosts public sound baths, breathwork gatherings, yin and vinyasa yoga, salsa and bachata classes, and community circles most weeks, run by independent Denver practitioners. The ${specs.ceilingFeet}-foot vaulted ceilings and original sanctuary acoustics are the reason so many sound and breath practitioners choose the room. Every upcoming session, with times, prices, and booking links, is listed at merrittwellness.net/calendar.`,
  },
  {
    question: 'How many guests fit, and is there parking?',
    answer: `Up to ${specs.capacity} guests, with a ~${specs.mainHallSqFt.toLocaleString('en-US')} sq ft main hall and roughly ${specs.fullBuildingSqFt.toLocaleString('en-US')} sq ft across the full building including the upstairs, cafe lounge, and breakout rooms. There are ${specs.parkingSpots} on-site parking spots — unusual for a Denver venue this close to the city — plus street parking in the surrounding blocks.`,
  },
  {
    question: 'Can we bring our own alcohol and caterer?',
    answer: 'Yes to both. BYOB is welcome and you are free to bring any caterer you like. Any event with alcohol needs a certificate of general liability insurance, and if alcohol is being served it must be served by a TIPS-certified bartender. Alcohol cannot be sold on premises. Events end by 10 PM in line with Denver neighborhood ordinances.',
  },
  {
    question: 'Is the venue wheelchair accessible?',
    answer: 'The front entrance has ramp access into the main hall. The main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at Merritt Workspace, which is part of the same property.',
  },
  {
    question: 'Where is Merritt Wellness located?',
    answer: `${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip} — on the west side of Denver in the ${contact.address.neighborhood} neighborhood, minutes from Highland, Berkeley, West Colfax, Jefferson Park, and Edgewater. Call ${contact.inquiries.phone} or email ${contact.inquiries.email} to arrange a tour.`,
  },
];

export default function Home() {
  const [calendarLoaded, setCalendarLoaded] = useState(false);

  // NOTE: the LocalBusiness block that used to live here has been REMOVED.
  // It shared an @id with the block in app/layout.tsx while disagreeing with
  // it (priceRange "$95/hour" vs "$$", string vs numeric coordinates,
  // areaServed illegally nested inside PostalAddress), which left crawlers
  // merging two conflicting nodes. The single canonical business node is now
  // built in lib/site-schema.ts and rendered once from the root layout.

  return (
    <>
      {/* The business and website nodes come from the root layout. This page
          adds only the site-wide FAQPage, whose questions are rendered
          visibly further down. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqJsonLd('/', faqs))}
      />

      <main className="bg-[#faf8f5] font-sans">
        {/* HERO — same treatment as the venue pages: full-bleed photo under
            the transparent navbar */}
        {/* A real street photo of the sanctuary alone — not the rendering
            that included the workspace building. The tower sits left of
            center, so bias the mobile crop toward it. */}
        <PageHero
          size="tall"
          image={{
            src: "/images/hero/1.webp",
            alt: "The restored 1905 brick sanctuary that houses Merritt Wellness, on its tree-lined corner in Denver's Sloans Lake neighborhood",
          }}
          eyebrow="Sloans Lake, Denver"
          title={
            <>
              A Restored 1905 Sanctuary
              <span className="block font-bold">Built for Gathering</span>
            </>
          }
          imageClassName="object-[44%_center] md:object-center"
          subtitle="Yoga, breathwork, sound baths, and dance all week long; weddings, concerts, and celebrations under 24-foot vaulted ceilings."
          ctas={[
            { label: "Host an Event", href: "/private-events" },
            { label: "Wellness & Classes", href: "/class-partnerships", variant: "ghost" },
          ]}
        />

        {/* WHAT HAPPENS HERE — the six doors in, mirroring the Events menu */}
        <section className="pt-14 pb-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                What happens here
              </span>
              <h2 className="text-4xl md:text-5xl font-light leading-tight text-[#4a3f3c] font-serif">
                One historic room,
                <span className="block font-bold text-[#735e59]">infinite possibilities</span>
              </h2>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#735e59] to-transparent mx-auto mt-6"></div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {homeEventTypes.map((type) => (
                <Link
                  key={type.href}
                  href={type.href}
                  className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl border border-[#735e59]/10 hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={type.image.src}
                      alt={type.image.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder={getBlurDataURL(type.image.src) ? "blur" : "empty"}
                      blurDataURL={getBlurDataURL(type.image.src)}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-7">
                    <h3 className="text-xl font-bold text-[#4a3f3c] font-serif mb-2 group-hover:text-[#735e59] transition-colors duration-200">
                      {type.label}
                    </h3>
                    <p className="text-[#6b5f5b] text-sm leading-relaxed">{type.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Divider between the event types and the story section */}
        <div className="flex items-center justify-center gap-4 py-4" aria-hidden="true">
          <div className="w-24 h-px bg-gradient-to-r from-transparent to-[#735e59]/40"></div>
          <div className="w-2 h-2 rounded-full bg-[#735e59]/40"></div>
          <div className="w-24 h-px bg-gradient-to-l from-transparent to-[#735e59]/40"></div>
        </div>

        {/* ABOUT SECTION - Enhanced headings and descriptions only */}
        <section id="about" className="relative py-24 bg-gradient-to-b from-[#faf8f5] via-[#f2eee9]/50 to-[#faf8f5] overflow-hidden">
          {/* Watercolor washes for depth, echoing the brand's texture */}
          <div className="absolute -top-24 -right-24 w-[480px] h-[480px] pointer-events-none z-0">
            <Image
              src="/images/overlays/WaterColor.png"
              alt=""
              width={480}
              height={480}
              className="w-full h-full object-contain opacity-70"
              loading="lazy"
              placeholder="blur"
              blurDataURL={getBlurDataURL("/images/overlays/WaterColor.png")}
            />
          </div>
          <div className="absolute -bottom-32 -left-28 w-[480px] h-[480px] pointer-events-none z-0">
            <Image
              src="/images/overlays/WaterColor.png"
              alt=""
              width={480}
              height={480}
              className="w-full h-full object-contain opacity-60 rotate-180"
              loading="lazy"
              placeholder="blur"
              blurDataURL={getBlurDataURL("/images/overlays/WaterColor.png")}
            />
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content - Enhanced with local keywords */}
              <div className="space-y-8">
                <div>
                  <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Since 1905•Denver Historic Landmark
                  </span>
                  <h2 className="text-4xl md:text-5xl font-light leading-tight text-[#4a3f3c] mb-6 font-serif">
                    Denver's Sacred Space
                    <span className="block font-bold text-[#735e59]">for Wellness & Community</span>
                  </h2>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-[#735e59] to-transparent mb-8"></div>
                  <div className="space-y-6">
                    {/* ENHANCED: Better local SEO content */}
                    <p className="text-lg text-[#6b5f5b] leading-relaxed">
                      Located in Denver's beloved Sloans Lake neighborhood, Merritt Wellness occupies a lovingly restored 1905 landmark that has served our community for over a century. The building offers Denver's wellness community, event hosts, and celebrating families a truly unique sanctuary.
                    </p>
                    <p className="text-lg text-[#6b5f5b] leading-relaxed">
                      Our 2,400 square foot space features original stained glass, soaring 24-foot ceilings, and perfect acoustics that make every yoga class, sound bath, and meditation session an extraordinary experience. From Highland to Berkeley, Regis to Sloans Lake, Denver wellness seekers find their home here.
                    </p>
                  </div>
                </div>

                {/* Enhanced Stats */}
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#735e59]/20">
                  <div className="text-center group">
                    <div className="text-3xl font-bold text-[#4a3f3c] mb-2 group-hover:text-[#735e59] transition-colors duration-300 font-serif">{new Date().getFullYear() - 1905}</div>
                    <div className="text-sm text-[#6b5f5b] uppercase tracking-wide">Years Serving Denver</div>
                  </div>
                  <div className="text-center group">
                    <div className="text-3xl font-bold text-[#4a3f3c] mb-2 group-hover:text-[#735e59] transition-colors duration-300 font-serif">24ft</div>
                    <div className="text-sm text-[#6b5f5b] uppercase tracking-wide">Vaulted Ceilings</div>
                  </div>
                  <div className="text-center group">
                    <div className="text-3xl font-bold text-[#4a3f3c] mb-2 group-hover:text-[#735e59] transition-colors duration-300 font-serif">2,400</div>
                    <div className="text-sm text-[#6b5f5b] uppercase tracking-wide">Square Feet</div>
                  </div>
                </div>

                {/* Call-to-Action */}
                <div className="pt-8">
                  <Link
                    href="/about"
                    className="inline-flex items-center bg-[#735e59] text-[#f2eee9] font-semibold px-8 py-4 rounded-xl hover:bg-[#5a4a46] transition-all duration-300 transform hover:-translate-y-1 group shadow-lg hover:shadow-xl"
                  >
                    <span>Learn Our Story</span>
                    <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Right Features Grid - Enhanced with local keywords */}
              <div className="grid grid-cols-2 gap-6 auto-rows-fr">
                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 flex flex-col">
                  <div className="w-16 h-16 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Landmark className="w-7 h-7 text-[#735e59]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#4a3f3c] mb-3 group-hover:text-[#735e59] transition-colors duration-300 flex-shrink-0 font-serif">Historic Denver Landmark</h3>
                  <p className="text-[#6b5f5b] text-sm leading-relaxed flex-1">
                    Original 1905 architecture with preserved stained glass, soaring ceilings, and hand-worn hardwood in the heart of Sloans Lake
                  </p>
                </div>

                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 flex flex-col">
                  <div className="w-16 h-16 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Sun className="w-7 h-7 text-[#735e59]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#4a3f3c] mb-3 group-hover:text-[#735e59] transition-colors duration-300 flex-shrink-0 font-serif">Natural Light, All Day</h3>
                  <p className="text-[#6b5f5b] text-sm leading-relaxed flex-1">
                    Tall arched windows and stained glass fill the hall with light that flatters a morning class and an evening reception alike
                  </p>
                </div>

                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 flex flex-col">
                  <div className="w-16 h-16 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <HeartHandshake className="w-7 h-7 text-[#735e59]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#4a3f3c] mb-3 group-hover:text-[#735e59] transition-colors duration-300 flex-shrink-0 font-serif">Open to Everyone</h3>
                  <p className="text-[#6b5f5b] text-sm leading-relaxed flex-1">
                    A non-denominational sanctuary welcoming every practice, tradition, celebration, and community
                  </p>
                </div>

                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 flex flex-col">
                  <div className="w-16 h-16 bg-[#735e59]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Music2 className="w-7 h-7 text-[#735e59]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#4a3f3c] mb-3 group-hover:text-[#735e59] transition-colors duration-300 flex-shrink-0 font-serif">Acoustics That Carry</h3>
                  <p className="text-[#6b5f5b] text-sm leading-relaxed flex-1">
                    Built for voices in 1905; the same acoustics now serve sound baths, concerts, and first dances
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <EnhancedGallery />

        {/* FAQ — the visible counterpart to the FAQPage JSON-LD above. These
            two read from the same `faqs` array so the markup can never
            describe answers a visitor cannot find on the page. */}
        <section className="py-20 bg-[#faf8f5]">
          <div className="max-w-7xl mx-auto px-6">
            <FaqSection faqs={faqs} heading="Questions About the Venue, Answered" />
          </div>
        </section>

        {/* BOOKING SECTION - Enhanced with local keywords */}
        <section
          id="booking"
          className="py-24 bg-[#735e59] relative overflow-hidden texture-dark"
          style={{
            // The taupe layer on top softens the swirl lines; raise its alpha to fade them further
            backgroundImage:
              'linear-gradient(rgba(115, 94, 89, 0.75), rgba(115, 94, 89, 0.75)), url("/images/overlays/Swirls.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <div className="mb-16">
              <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/10 backdrop-blur-sm text-[#f2eee9]/90 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                Book Your Denver Wellness Experience
              </span>
              <h2 className="text-4xl md:text-6xl font-light text-[#f2eee9] mb-8 font-serif">
                Reserve Your
                <span className="block font-bold">Sloans Lake Sanctuary</span>
              </h2>
              <p className="text-xl text-[#f2eee9]/80 max-w-3xl mx-auto leading-relaxed mb-12">
                Join Denver's vibrant wellness community or create your own transformative experience in Colorado's most inspiring historic yoga and meditation space
              </p>
            </div>

            {/* Enhanced Calendar Section */}
            <div
              className="rounded-3xl p-8 border border-[#735e59] bg-[#735e59] mb-12 relative overflow-hidden"
            >
              <div className="bg-[#faf8f5] rounded-2xl overflow-hidden shadow-2xl relative z-10">
                <div className="p-6 bg-gradient-to-r from-[#f2eee9] to-[#faf8f5] border-b border-[#735e59]/10">
                  <h3 className="text-2xl font-bold text-[#4a3f3c] mb-2 font-serif">Denver Wellness Events Calendar</h3>
                  <p className="text-[#6b5f5b]">Discover upcoming yoga classes, sound baths, and workshops at our Sloans Lake sanctuary</p>
                </div>
                {/* Calendar with improved loading */}
                <div className="relative h-96 bg-[#f2eee9]/50">
                  {!calendarLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#f2eee9]/50">
                      <div className="text-[#6b5f5b] text-center">
                        <div className="w-12 h-12 border-4 border-[#a08b84] border-t-[#735e59] rounded-full animate-spin mb-4 mx-auto"></div>
                        <p className="text-lg font-medium">Loading Denver wellness schedule...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    src="https://calendar.google.com/calendar/embed?src=c_002ae67fc0cd95665a26d4183a61597bd74447d4760b239bd5135518cf978704%40group.calendar.google.com&ctz=America%2FDenver"
                    className="w-full h-full border-0"
                    title="Merritt Wellness Denver Events Calendar - Yoga, Meditation, Sound Healing"
                    onLoad={() => setCalendarLoaded(true)}
                    style={{ display: calendarLoaded ? 'block' : 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Visible rating. This is what makes the `aggregateRating` in
                the JSON-LD legitimate: Google requires an aggregate rating to
                correspond to review content a visitor can see and verify, and
                this links straight out to the Google Business Profile the
                figures come from. If the review count changes, update
                `reviews` in app/data/site.ts — never hardcode it here. */}
            <a
              href={reviews.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 mb-10 px-6 py-3 rounded-full bg-[#f2eee9]/10 backdrop-blur-sm border border-[#f2eee9]/20 hover:bg-[#f2eee9]/20 transition-colors duration-300"
            >
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: reviews.bestRating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#f2eee9] text-[#f2eee9]" />
                ))}
              </span>
              <span className="text-[#f2eee9] font-semibold">
                {reviews.ratingValue.toFixed(1)} out of {reviews.bestRating}
              </span>
              <span className="text-[#f2eee9]/70 text-sm">
                from {reviews.count} {reviews.source} reviews
              </span>
            </a>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <Link
                href="/book"
                className="group relative bg-[#f2eee9] text-[#735e59] font-bold px-16 py-6 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10 flex items-center text-lg">
                  <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                  Reserve Your Denver Space
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>

              <a
                href="tel:720-357-9499"
                className="group border-2 border-[#f2eee9]/70 text-[#f2eee9] font-bold px-16 py-6 rounded-full backdrop-blur-sm hover:bg-[#f2eee9] hover:text-[#735e59] transition-all duration-500 hover:border-[#f2eee9] text-lg"
              >
                <span className="flex items-center">
                  <svg className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call (720) 357-9499
                </span>
              </a>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: `${new Date().getFullYear() - 1905}`, label: "Years in Denver" },
                { number: "125", label: "Guest Capacity" },
                { number: "22", label: "On-Site Parking Spots" },
                { number: "2,400", label: "Square Feet" }
              ].map((item, index) => (
                <div key={index} className="group">
                  <div className="text-3xl font-bold text-[#f2eee9] mb-2 group-hover:text-white transition-colors duration-300 font-serif">{item.number}</div>
                  <div className="text-[#f2eee9]/70 text-sm uppercase tracking-wide">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT SECTION - Enhanced with local keywords */}
        <section className="py-20 bg-gradient-to-b from-[#f2eee9] to-[#faf8f5] relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content - Enhanced with local keywords */}
              <div>
                <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Visit Denver's Premier Wellness Sanctuary
                </span>
                <h2 className="text-4xl md:text-5xl font-light leading-tight text-[#4a3f3c] mb-8 font-serif">
                  Find Your Way to
                  <span className="block font-bold text-[#735e59]">Merritt Wellness Denver</span>
                </h2>

                <div className="space-y-8 mb-12">
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#735e59]/20 transition-colors duration-300">
                      <svg className="w-6 h-6 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#4a3f3c] mb-2 group-hover:text-[#735e59] transition-colors duration-300 font-serif">Our Denver Location</h3>
                      <p className="text-[#6b5f5b] text-lg leading-relaxed">
                        2246 Irving Street<br />
                        Denver, Colorado 80211<br />
                        <span className="text-sm text-[#a08b84]">Heart of Sloans Lake Neighborhood</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-[#a08b84]/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#a08b84]/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#4a3f3c] mb-2 group-hover:text-[#735e59] transition-colors duration-300 font-serif">Denver Studio Hours</h3>
                      {/* Reads from `hours` so this can never drift from the
                          Google Business Profile. It used to claim 6 AM to
                          10 PM every day, which was wrong twice over. */}
                      <p className="text-[#6b5f5b] text-lg leading-relaxed">
                        Available for bookings<br />
                        Monday - Saturday<br />
                        <span className="text-sm text-[#a08b84]">7:00 AM - 10:00 PM Mountain Time</span><br />
                        <span className="text-sm text-[#a08b84]">Sundays from 4:30 PM</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-[#735e59]/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#735e59]/20 transition-colors duration-300">
                      <svg className="w-6 h-6 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#4a3f3c] mb-2 group-hover:text-[#735e59] transition-colors duration-300 font-serif">Connect with Us</h3>
                      <p className="text-[#6b5f5b] text-lg leading-relaxed">
                        Ready to answer your call<br />
                        <span className="text-sm text-[#a08b84]">(720) 357-9499 • manager@merrittwellness.net</span>
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/book"
                  className="inline-flex items-center bg-[#735e59] text-[#f2eee9] font-semibold px-10 py-4 rounded-full shadow-lg hover:bg-[#5a4a46] hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  <svg className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Start the Conversation
                </Link>
              </div>

              {/* Right Map */}
              <div className="relative">
                {/* Brushstroke Circle Overlay */}
                <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0">
                  <Image
                    src="/images/overlays/Circle.png"
                    alt=""
                    fill
                    className="object-contain opacity-80"
                    placeholder="blur"
                    blurDataURL={getBlurDataURL("/images/overlays/Circle.png")}
                  />
                </div>
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  <iframe
                    src={maps.embed}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Find Merritt Wellness - Historic yoga and wellness studio in Denver's Sloans Lake neighborhood"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enhanced Custom CSS - Same as before */}
      <style jsx>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up-delay {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slow-zoom {
          animation: slow-zoom 20s ease-in-out infinite alternate;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delay {
          animation: float-delay 8s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out 0.3s both;
        }
        
        .animate-fade-in-up-delay {
          animation: fade-in-up-delay 1s ease-out 0.6s both;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(115, 94, 89, 0.25);
        }

        /* Improved hover effects */
        .group:hover .group-hover\\:brightness-110 {
          filter: brightness(1.1);
        }
        
        /* Better transitions for mobile */
        @media (max-width: 768px) {
          .hover\\:-translate-y-2:hover {
            transform: translateY(-4px);
          }
          
          .hover\\:scale-105:hover {
            transform: scale(1.02);
          }
        }
      `}</style>
    </>
  );
}