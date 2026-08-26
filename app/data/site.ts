// Central site configuration for Merritt Wellness marketing pages.
//
// Everything a venue manager might need to update without touching page code
// lives here: navigation, contact routing, venue specs, policies, amenities,
// open class blocks, the Sunday congregation schedule, Merritt Workspace
// member benefits, and the event-type content blocks that feed
// /private-events.
//
// CONTACT ROUTING RULE: all NEW inquiries (forms, mailto links, CTAs) go to
// `contact.inquiries`. clientservices@merrittwellness.net is for existing
// booked clients only and must never receive new-inquiry traffic.

// Safe to import from this file even though marketing pages are client
// components: flex-space-hours.js is a dependency-free module of constants and
// date math, with no path to the promo dictionary.
import { FLEX_SPACE_WINDOW_LABEL, FLEX_SPACE_DAYS_LABEL } from '@/app/lib/flex-space-hours';

export const contact = {
  inquiries: {
    email: 'manager@merrittwellness.net',
    phone: '(720) 357-9499',
    phoneHref: 'tel:720-357-9499',
    // E.164, for JSON-LD `telephone` properties. Schema.org consumers expect
    // an unambiguous international form, not the display format.
    phoneE164: '+1-720-357-9499',
  },
  clientServices: {
    email: 'clientservices@merrittwellness.net',
    phone: '(303) 359-8337',
    phoneHref: 'tel:303-359-8337',
  },
  address: {
    street: '2246 Irving Street',
    city: 'Denver',
    state: 'CO',
    zip: '80211',
    neighborhood: 'Sloans Lake',
    lat: 39.7508,
    lng: -105.0332,
  },
  social: {
    instagram: 'https://www.instagram.com/merrittwellnessdenver/',
    facebook: 'https://www.facebook.com/MerrittWellnessDenver/',
  },
} as const;

// Merritt Workspace is a sibling property next door, not a third party.
// Link to it; never duplicate its pricing or inventory here.
export const workspace = {
  name: 'Merritt Workspace',
  url: 'https://merrittworkspace.net',
} as const;

// Opening hours, in one place. Feeds the visible copy AND the
// openingHoursSpecification in the JSON-LD graph, so both stay identical to
// the Google Business Profile — a listing and a site that disagree about
// hours is a NAP inconsistency Google can see.
//
// These MUST match the Business Profile exactly. Verified against it in
// August 2026: Monday to Saturday 7 AM to 10 PM, Sunday 4:30 PM to 10 PM.
//
// The site previously advertised a blanket "6 AM to 10 PM, seven days a
// week", which contradicted the Business Profile on both counts and
// contradicted this very file: `sundaySchedule` below states the building is
// held by congregations until 4:30 PM every Sunday, so it was never
// bookable from 6 AM on a Sunday.
export const hours = {
  /** Monday through Saturday */
  weekdayOpens: '07:00',
  weekdayCloses: '22:00',
  /** Sunday — congregations hold the sanctuary until 4:30 PM. */
  sundayOpens: '16:30',
  sundayCloses: '22:00',
  display: 'Monday to Saturday, 7 AM to 10 PM, and Sunday evenings from 4:30 PM',
} as const;

// REVIEW DATA — READ BEFORE EDITING.
//
// These numbers go straight into `aggregateRating` in the JSON-LD graph and
// are rendered visibly on the site. Google requires an aggregate rating to
// reflect real, verifiable reviews; an invented count is grounds for a
// structured-data manual penalty, and a fabricated 5.0/47 block had to be
// stripped from this codebase once already. Only ever set these from the
// live Google Business Profile, and update `count` when it actually moves.
//
// Verified with the owner: 5.0 across 20 Google reviews (August 2026).
export const reviews = {
  ratingValue: 5.0,
  bestRating: 5,
  count: 20,
  source: 'Google',
  // The Business Profile's own share link, supplied by the owner. This is
  // what the visible rating on the homepage links to, and it is the proof
  // behind `aggregateRating` — keep it pointing at the real profile.
  url: 'https://maps.app.goo.gl/AfqGvGfAzVwbMka3A',
} as const;

// GOOGLE MAPS — always point at the BUSINESS listing, never the street
// address.
//
// A maps embed built from "2246 Irving Street, Denver, CO 80211" resolves to
// a bare address pin: no business name, no rating, no reviews, no photos, and
// no "Save"/"Directions" actions. The site used to embed exactly that, which
// meant the one place a visitor is most likely to check us out showed a blank
// dot instead of the 5.0-star Google Business Profile the rest of the page
// cites.
//
// `embed` is the Business Profile's own embed URL — the `!1s0x...` segment is
// the place's feature ID, and it is what makes Google render the business
// card (name, stars, review count, directions) inside the iframe. If you ever
// regenerate it, copy it from Share → Embed a map on the Business Profile
// itself, and check the copied string still names `Merritt%20Wellness` rather
// than a street address.
//
// `url` is the profile's share link, for "open in Google Maps" links.
//
// Note the iframe's own card sits at the TOP-LEFT of the embed, so do not
// overlay UI there — that collision is why the homepage's custom location
// badge was removed.
export const maps = {
  embed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.495321347999!2d-105.03455021378463!3d39.75098602255835!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c79ef928f5243%3A0xbb1687ee09f2ad08!2sMerritt%20Wellness!5e0!3m2!1sen!2sus!4v1787771131320!5m2!1sen!2sus',
  url: 'https://maps.app.goo.gl/JphD2XBu6KVUDn4D9',
} as const;

// Neighborhoods and cities the venue actually draws from. Used for
// `areaServed` in the graph — keep it to places a renter would plausibly
// travel from, not a padded list of every Colorado municipality.
export const areaServed = {
  neighborhoods: [
    "Sloans Lake",
    'Highland',
    'West Highland',
    'Berkeley',
    'Regis',
    'West Colfax',
    'Jefferson Park',
    'Villa Park',
  ],
  cities: ['Denver', 'Edgewater', 'Lakewood', 'Wheat Ridge', 'Arvada', 'Golden'],
} as const;

export interface NavChild {
  label: string;
  href: string;
}
export interface NavItem {
  label: string;
  href?: string;
  children?: NavChild[];
}

// Top-level navigation. No Home item: the logo is the home link.
//
// "Events" lists every TYPE of thing hosted here, with no frequency implied
// — a visitor picks what they are doing. "Partnerships" holds only the
// arrangement side: recurring booking rates and the studio/workspace next
// door. Weddings first, wellness second (the venue's core identity); do not
// alphabetize. The /private-events and /class-partnerships URLs are kept for
// their search value.
export const navItems: NavItem[] = [
  {
    label: 'Events',
    children: [
      { label: 'Weddings', href: '/weddings' },
      { label: 'Wellness & Movement Classes', href: '/class-partnerships' },
      { label: 'Concerts & Performances', href: '/concerts' },
      { label: 'Art Shows & Exhibitions', href: '/art-shows' },
      { label: 'Faith & Community Gatherings', href: '/congregations' },
      { label: 'All Private Events', href: '/private-events' },
    ],
  },
  {
    label: 'Partnerships',
    children: [
      { label: 'Recurring Bookings & Rates', href: '/recurring' },
      { label: 'Studio & Workspace', href: '/studio' },
    ],
  },
  { label: "What's On", href: '/calendar' },
  { label: 'About', href: '/about' },
];

// Co-promotion for public events: stated wherever hosts might assume they are
// on their own for marketing. Keep the three channels accurate.
export const coPromotion = {
  heading: 'Going public? We promote it with you.',
  body: 'Any event you open to the public gets our co-promotion at no charge: a flyer on the community bulletin board, a listing on the What’s On calendar here on the site, and posts to our social channels. Our audience already comes here to find things to do; a public event starts with a crowd.',
  channels: [
    'Community bulletin board flyer',
    "What's On calendar listing",
    'Instagram and Facebook posts',
  ],
} as const;

// Pending routes, awaiting photography. When photos exist, lift the matching
// content block out of `eventTypes` below into a dedicated page and add the
// route here and in app/sitemap.ts.
// { label: 'Celebrations of Life', href: '/celebrations-of-life' },  // pending photography
// { label: 'Parties & Milestones', href: '/parties' },               // pending photography
// { label: 'Corporate Events', href: '/corporate' },                 // pending photography

export const specs = {
  capacity: 125,
  mainHallSqFt: 1100,
  upstairsSqFt: 1600,
  fullBuildingSqFt: 2400,
  parkingSpots: 22,
  ceilingFeet: 24,
  built: 1905,
  mirrorFeet: 15,
} as const;

export const specItems = [
  { label: 'Guest capacity', value: 'Up to 125' },
  { label: 'Main hall', value: '~1,100 sq ft' },
  { label: 'Upstairs', value: '~1,600 sq ft' },
  { label: 'Full building', value: '~2,400 sq ft' },
  { label: 'On-site parking', value: '22 spots' },
  { label: 'Vaulted ceilings', value: '24 feet' },
] as const;

export const amenities = [
  'Surround sound system',
  'Projector and screen',
  'Air conditioning',
  'Cafe lounge area',
  'Breakout rooms',
  'Downstairs getting-ready space',
] as const;

// Required disclosures. State each once per page, plainly, in the right
// section; do not stack or repeat them.
export const policies = [
  {
    title: 'Alcohol',
    body: 'BYOB is welcome. Any event with alcohol needs a certificate of general liability insurance, and if alcohol is being served it must be served by a TIPS-certified bartender. Alcohol cannot be sold on premises.',
  },
  {
    title: 'Hours',
    body: 'Events end by 10 PM. Setup and breakdown happen within your booked rental window.',
  },
  {
    title: 'Accessibility',
    body: 'The front entrance has ramp access. Main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at Merritt Workspace.',
  },
] as const;

// If a page mentions live sound or bands, include this.
export const mixerPolicy =
  'The on-site mixer is available to professional sound techs only.';

// ---------------------------------------------------------------------------
// Classes & Studio data. Update these as availability changes; no code
// changes needed.
// ---------------------------------------------------------------------------

// Open recurring class blocks shown on /class-partnerships.
//
// publishSpecificBlocks: while most of the week is open (2 of ~10 blocks
// booked as of Aug 2026), the page shows general-availability copy instead
// of naming slots — listing three "open blocks" would undersell how much is
// available and fake a scarcity that is not real yet. Once roughly 5+ blocks
// are booked, set this to true and list the ACTUAL remaining open blocks;
// the page will switch back to the specific-slots presentation.
export const openClassBlocks = {
  publishSpecificBlocks: false,
  season: 'fall',
  blocks: [
    { day: 'Monday', time: '6 to 8 PM' },
    { day: 'Thursday', time: '4 to 6 PM' },
    { day: 'Sunday', time: '5 to 7 PM' },
  ],
} as const;

// Sunday congregation schedule shown on /congregations. The building holds
// three daytime congregation slots; the space is vacated by 4:30 PM.
export const sundaySchedule = {
  serviceWindow: '7 AM to 4:30 PM',
  vacatedBy: '4:30 PM',
  communitiesInResidence: 2,
  daytimeSlots: 3,
  eveningAvailability: 'Sunday evenings after 4:30 PM',
} as const;

// Merritt Workspace member benefit: included Merritt Wellness venue hours.
// Shown side by side on /studio.
//
// The window is DERIVED from app/lib/flex-space-hours.js rather than written
// out here, because it is the same window: weekday daytime is the block the
// workspace holds the hall for, and members booking it is exactly what that
// block is for. The two used to be stated independently — this file advertised
// 9 AM to 5 PM while the booking form enforced 8 AM to 4 PM — so the site and
// the software disagreed about when members could actually book. Deriving it
// means changing the hours in one place changes them everywhere.
export const workspaceMemberHours = {
  window: `${FLEX_SPACE_DAYS_LABEL}, ${FLEX_SPACE_WINDOW_LABEL}`,
  tiers: [
    { name: 'Dedicated desk', hoursPerMonth: 4 },
    { name: 'Private office', hoursPerMonth: 8 },
  ],
} as const;

// ---------------------------------------------------------------------------
// Event-type content blocks for /private-events.
//
// Types without usable photography live here as prose so the terms exist on
// the site. When photos arrive, a block can be lifted into its own route
// (see the pending-route placeholders above) without a rewrite.
// ---------------------------------------------------------------------------

export interface EventTypeBlock {
  key: string;
  title: string;
  // Route if a dedicated page exists; null means covered by /private-events
  // until photography is available.
  href: string | null;
  description: string;
}

export const eventTypes: EventTypeBlock[] = [
  {
    key: 'weddings',
    title: 'Weddings',
    href: '/weddings',
    description:
      'Ceremonies and receptions under 24-foot vaulted ceilings, with original stained glass and room for up to 125 guests.',
  },
  {
    key: 'concerts',
    title: 'Concerts & Performances',
    href: '/concerts',
    description:
      'Live music, recitals, and performances in a hall built for sound, with a surround system and a cafe lounge for intermission.',
  },
  {
    key: 'art-shows',
    title: 'Art Shows & Exhibitions',
    href: '/art-shows',
    description:
      'Openings and exhibitions with hardwood floors, tall walls, and natural light that lets the work carry the room.',
  },
  {
    key: 'wellness-classes',
    title: 'Wellness & Movement Classes',
    href: '/class-partnerships',
    description:
      'Yoga, breathwork, sound baths, dance, and martial arts, as a one-off workshop or a weekly block.',
  },
  {
    key: 'congregations',
    title: 'Faith & Community Gatherings',
    href: '/congregations',
    description:
      'A sanctuary since 1905, open to congregations and spiritual communities of every tradition. Two churches meet here every Sunday.',
  },
  {
    key: 'celebrations-of-life',
    title: 'Celebrations of Life & Memorials',
    href: null, // pending photography
    description:
      'A century-old sanctuary is a natural place to gather, remember, and give a life its due. The room holds quiet as well as it holds music, and the cafe lounge gives families a place to be together before and after the service.',
  },
  {
    key: 'parties',
    title: 'Parties & Milestones',
    href: null, // pending photography
    description:
      'Birthdays, quinceañeras, showers, graduations, anniversaries. The main hall gives a milestone the setting it deserves, and the breakout rooms keep food, gifts, and staging out of the way.',
  },
  {
    key: 'corporate',
    title: 'Corporate Events & Offsites',
    href: null, // pending photography
    description:
      'Offsites, retreats, and team days that feel nothing like a conference room. Projector, screen, surround sound, and a cafe lounge for the breaks people actually remember.',
  },
];
