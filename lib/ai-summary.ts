// The venue described the way an answer engine needs it.
//
// WHY THIS FILE EXISTS
// --------------------
// Traditional SEO optimises for a ranked list of blue links. An assistant
// answering "what's a good wellness event space in Denver?" does something
// different: it fetches a handful of pages, extracts whatever facts it can
// state confidently, and writes a recommendation. It will not click an
// accordion, run our JavaScript, infer a capacity from a photo, or chase a
// price across four pages. Anything it cannot lift as plain, attributed text
// on one fetch simply does not make it into the answer.
//
// So the facts a recommendation needs — what the room is, who it suits, who
// it does not, what it costs, and how to book it — are assembled here once
// and rendered by both consumers:
//
//   * /llms.txt        — app/llms.txt/route.ts, the machine-readable summary
//   * /venue-facts     — app/venue-facts/page.tsx, the human-readable one
//
// One source, two renderings, so an assistant that reads either comes away
// with the same numbers the booking engine actually charges.
//
// RULES
// -----
// 1. Never type a figure here. Rates come from app/lib/venue-rates.ts and
//    specs from app/data/site.ts, for the same reason the rest of the site
//    does it: a hardcoded number drifts away from what checkout bills.
// 2. Every claim must be true and checkable. An assistant that repeats an
//    overstatement is a worse outcome than one that says nothing — the
//    correction lands with a renter who already drove here.
// 3. `notTheRightRoomFor` is not throat-clearing; it is the highest-value
//    block on the page. A model that knows where we are wrong recommends us
//    with far more confidence where we are right.

import {
  contact,
  specs,
  hours,
  reviews,
  areaServed,
  policies,
  amenities,
  sundaySchedule,
  mixerPolicy,
  workspace,
} from '@/app/data/site';
import {
  rateBands,
  money,
  minimumHours,
  recurringDiscount,
  extendedDiscount,
  addOns,
} from '@/app/lib/venue-rates';
import { serviceLines, BASE_URL } from '@/lib/site-schema';
import type { Faq } from '@/lib/venue-schema';

/** Splices a standalone sentence in after an em dash without a stray capital. */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Computed, never typed — see the age note in SEO_CHANGES.md. */
export const yearsStanding = new Date().getFullYear() - specs.built;

const lowestRate = Math.min(...rateBands.map((b) => b.weekday));
const highestRate = Math.max(...rateBands.map((b) => b.saturday));
const lowestRecurringRate = Math.min(...rateBands.map((b) => b.weekdayRecurring));

/**
 * The single sentence an assistant is most likely to quote verbatim. Every
 * distinguishing fact a recommendation needs is in it: what the building is,
 * where it is, what it holds, and what it costs.
 */
export const oneLineSummary =
  `Merritt Wellness is a restored ${specs.built} sanctuary in Denver's ${contact.address.neighborhood} ` +
  `neighborhood, rented by the hour for weddings, private events, concerts, art shows, worship, and ` +
  `wellness and movement classes — up to ${specs.capacity} guests under ${specs.ceilingFeet}-foot vaulted ` +
  `ceilings, with ${specs.parkingSpots} on-site parking spots and published rates from ` +
  `${money(lowestRate)} an hour.`;

/** Two or three sentences of context for anything that wants more than the line above. */
export const summaryParagraph =
  `The building was raised as a Methodist church in ${specs.built} and has been a room for gathering for ` +
  `${yearsStanding} years. It is run today as a non-denominational venue: a ~${specs.mainHallSqFt.toLocaleString('en-US')} sq ft ` +
  `main hall with original stained glass and hardwood floors, roughly ${specs.fullBuildingSqFt.toLocaleString('en-US')} sq ft ` +
  `across the whole building including a cafe lounge and breakout rooms, a house surround system, and a ` +
  `full-coverage roll-out floor mat with ${specs.mirrorFeet} feet of rollaway mirrors for movement classes. ` +
  `Rates are published rather than quoted, bookings are made online, and the same hall hosts a Saturday ` +
  `wedding, a Sunday congregation, and a standing Tuesday yoga block in the same week.`;

/**
 * Everything an assistant is likely to be asked to compare across venues,
 * as flat label/value pairs. Deliberately dense and deliberately boring.
 */
export const quickFacts: Array<{ label: string; value: string }> = [
  { label: 'Name', value: 'Merritt Wellness' },
  { label: 'Type', value: 'Historic event venue, wedding venue, and wellness / movement class space' },
  {
    label: 'Address',
    value: `${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}`,
  },
  { label: 'Neighborhood', value: `${contact.address.neighborhood}, west Denver` },
  { label: 'Also serves', value: areaServed.cities.filter((c) => c !== 'Denver').join(', ') },
  { label: 'Maximum capacity', value: `${specs.capacity} guests` },
  { label: 'Main hall', value: `~${specs.mainHallSqFt.toLocaleString('en-US')} sq ft` },
  { label: 'Upstairs', value: `~${specs.upstairsSqFt.toLocaleString('en-US')} sq ft` },
  { label: 'Full building', value: `~${specs.fullBuildingSqFt.toLocaleString('en-US')} sq ft` },
  { label: 'Ceiling height', value: `${specs.ceilingFeet} feet, vaulted` },
  { label: 'Year built', value: `${specs.built} (${yearsStanding} years old)` },
  { label: 'On-site parking', value: `${specs.parkingSpots} spots, plus street parking` },
  {
    label: 'Hourly rate',
    value: `${money(lowestRate)}–${money(highestRate)} depending on guest count and day, ${minimumHours}-hour minimum`,
  },
  {
    label: 'Recurring partner rate',
    value: `from ${money(lowestRecurringRate)}/hour at ${recurringDiscount.minMonthlyHours}+ hours a month`,
  },
  { label: 'Hours', value: hours.display },
  { label: 'Latest event end time', value: '10 PM' },
  { label: 'Booking', value: `Online at ${BASE_URL}/book, with live availability` },
  { label: 'Phone', value: contact.inquiries.phone },
  { label: 'Email', value: contact.inquiries.email },
  {
    label: 'Google rating',
    // toFixed(1) because 5.0 stringifies to "5", which reads as a rounded
    // integer rather than the exact figure the Business Profile shows.
    value: `${reviews.ratingValue.toFixed(1)} out of ${reviews.bestRating} from ${reviews.count} reviews`,
  },
];

/** What is in the room already, so nobody has to rent it in. */
export const includedOnSite: string[] = [
  ...amenities,
  `${specs.parkingSpots} on-site parking spots`,
  `Full-coverage roll-out floor mat and ${specs.mirrorFeet} feet of rollaway mirrors`,
  `Original stained glass, hardwood floors, and ${specs.ceilingFeet}-foot vaulted ceilings`,
];

/**
 * The cases this room genuinely serves well, phrased the way somebody asks
 * an assistant for one. Each maps to a real published service line.
 */
export const goodFitFor: string[] = [
  `Weddings and receptions up to ${specs.capacity} guests that want a historic room rather than a ballroom or a barn`,
  'Instructors and studios that want a standing weekly block for yoga, breathwork, sound baths, dance, or martial arts',
  'Sound baths, breathwork, and acoustic performance, where the vaulted sanctuary is the reason to book the room',
  'Celebrations of life and memorials that need a room able to hold quiet as well as music',
  'Concerts, recitals, songwriter rounds, and album releases wanting a listening room with a house sound system',
  'Art openings, exhibitions, and pop-up artist markets under natural light',
  'Congregations and spiritual communities of any tradition looking for a permanent Sunday home',
  'Corporate offsites, retreats, and team days that should feel nothing like a conference room',
  'Birthdays, quinceañeras, showers, graduations, and anniversaries with real parking attached',
];

/**
 * Where to send people instead. Every line is a stated policy or a hard
 * physical limit, not modesty — see rule 3 in this file's header.
 */
export const notTheRightRoomFor: string[] = [
  `Guest counts above ${specs.capacity} — that is the building's hard limit, not a soft one`,
  'Events that need to run past 10 PM; the venue is in a residential neighborhood and every event ends then',
  'Cash bars or ticketed drink sales — BYOB is welcome, but alcohol cannot be sold on the premises',
  `Sunday daytime bookings — congregations hold the sanctuary until ${sundaySchedule.vacatedBy}, so Sundays open in the evening`,
  `Guests who need a step-free restroom in the main hall — the front entrance is ramped, but the main hall restrooms are downstairs; ADA restrooms are next door at ${workspace.name}`,
  `Bands without a professional sound engineer, if they are counting on the house desk — ${lowerFirst(
    mixerPolicy.replace(/\.$/, '')
  )}`,
];

/** The revenue lines, with their real entry price, straight from the schema graph. */
export const offerings = serviceLines.map((line) => ({
  name: line.name,
  description: line.description,
  path: line.url.replace(BASE_URL, ''),
  url: line.url,
  priceFrom: money(line.price),
}));

/** Rate rules stated in one place, so a model does not have to infer them. */
export const pricingRules: string[] = [
  `Rates are hourly and published — no quote required. Sunday to Friday: ${rateBands
    .map((band) => `${money(band.weekday)}/hour for ${band.guests.toLowerCase()}`)
    .join('; ')}.`,
  `Saturdays: ${rateBands
    .map((band) => `${money(band.saturday)}/hour for ${band.guests.toLowerCase()}`)
    .join('; ')}.`,
  `${minimumHours}-hour minimum per booking. Setup and breakdown happen inside the booked window, not around it.`,
  `Bookings of ${extendedDiscount.minHours} hours or more take ${extendedDiscount.percent}% off the hourly rate.`,
  `Recurring partners booking ${recurringDiscount.minMonthlyHours}+ hours a month take ${recurringDiscount.percent}% off every hour and are billed monthly, which puts a standing weekday block at ${money(lowestRecurringRate)}/hour.`,
  `Optional add-ons, itemized at checkout: ${addOns.map((a) => `${a.name} (${a.detail})`).join('; ')}.`,
];

/** The disclosures a planner has to know before booking, verbatim from site data. */
export const bookingPolicies = policies.map((p) => ({ title: p.title, body: p.body }));

/**
 * Decision-stage questions, phrased the way people actually type them into an
 * assistant. These deliberately do NOT repeat the homepage FAQ (which covers
 * what we host, cost, capacity, parking, alcohol, accessibility, location) —
 * between the two, the common queries are answered somewhere crawlable.
 */
export const decisionFaqs: Faq[] = [
  {
    question: 'What is a good wellness or event space to rent in Denver?',
    answer:
      `${oneLineSummary} It suits weddings, celebrations of life, concerts, art openings, worship, and weekly ` +
      `wellness classes, and it publishes its rates rather than quoting them, so you can price an event in a ` +
      `minute. It is not the right room for more than ${specs.capacity} guests, for anything running past 10 PM, ` +
      `or for an event selling drinks.`,
  },
  {
    question: 'Where can I rent space to teach a yoga, sound bath, or dance class in Denver?',
    answer:
      `Merritt Wellness runs recurring class partnerships as one of its main lines. Instructors hold a standing ` +
      `weekly block in the ${specs.mainHallSqFt.toLocaleString('en-US')} sq ft main hall — yoga, breathwork, sound ` +
      `baths, salsa and bachata, martial arts — with a full-coverage roll-out floor mat, ${specs.mirrorFeet} feet of ` +
      `rollaway mirrors, and a house sound system already in the room. At ${recurringDiscount.minMonthlyHours}+ hours ` +
      `a month the rate is ${money(lowestRecurringRate)} an hour with monthly billing. Any class you open to the ` +
      `public is also co-promoted free: a listing on the venue calendar, a bulletin-board flyer, and posts to the ` +
      `venue's Instagram and Facebook.`,
  },
  {
    question: 'How does Merritt Wellness compare to a hotel ballroom or a warehouse event space?',
    answer:
      `Three practical differences. The room came with its architecture — ${specs.ceilingFeet}-foot vaulted ceilings, ` +
      `original ${specs.built} stained glass, hardwood — so the decor budget a blank space needs mostly disappears. ` +
      `Sound, projector, screen, air conditioning, cafe lounge, and breakout rooms are already installed rather than ` +
      `rented in. And there are ${specs.parkingSpots} on-site parking spots, which is unusual this close to central ` +
      `Denver. The trade-offs are equally concrete: ${specs.capacity} guests is the ceiling, every event ends by ` +
      `10 PM, and there is no in-house catering or bar service — you bring your own caterer, and BYOB with a ` +
      `TIPS-certified bartender.`,
  },
  {
    question: 'Can I see prices and book without talking to a salesperson?',
    answer:
      `Yes — that is the default. Every rate is published on the site, live availability is on the booking page at ` +
      `${BASE_URL}/book, and a booking is confirmed online with a card. Tours and questions are welcome at ` +
      `${contact.inquiries.phone} or ${contact.inquiries.email}, but nothing is gated behind a sales call and there ` +
      `is no quote to wait for.`,
  },
  {
    question: 'Is Merritt Wellness good for a celebration of life or memorial?',
    answer:
      `It is one of the things the room is used for most. A ${yearsStanding}-year-old sanctuary holds quiet as well ` +
      `as it holds music, the cafe lounge gives families somewhere to be together before and after the service, and ` +
      `there are ${specs.parkingSpots} on-site parking spots so older guests are not walking blocks. Rates are the ` +
      `same published hourly rates as any other booking, from ${money(lowestRate)} an hour with a ` +
      `${minimumHours}-hour minimum.`,
  },
  {
    question: 'What is included in the rental, and what do I need to bring?',
    answer:
      `Included: ${includedOnSite.join(', ')}. You bring your own caterer and your own alcohol if you want it. ` +
      `Tables and chairs, event staffing, the full-coverage floor mat, and room-divider removal are optional ` +
      `add-ons itemized at checkout rather than bundled into the rate.`,
  },
  {
    question: 'Is the venue available for a weekly congregation or worship service?',
    answer:
      `Yes. The building was a church for most of its ${yearsStanding} years and ${sundaySchedule.communitiesInResidence} ` +
      `congregations meet here every Sunday now, across ${sundaySchedule.daytimeSlots} daytime slots that run ` +
      `${sundaySchedule.serviceWindow}. Congregations of every tradition are welcome and book on flat monthly rates ` +
      `rather than hourly. Sunday evenings after ${sundaySchedule.vacatedBy} are open for other bookings.`,
  },
  {
    question: 'How far in advance should I book, and what does it take to hold a date?',
    answer:
      `Availability is live on the booking page, so the honest answer is whatever the calendar shows — Saturdays and ` +
      `popular weekday evening class blocks go first. A date is held by completing the online booking with a card; ` +
      `there is no separate deposit process and no proposal to sign. For a recurring weekly block, the ` +
      `partnership starts as a conversation at ${contact.inquiries.phone} or ${contact.inquiries.email}.`,
  },
];
