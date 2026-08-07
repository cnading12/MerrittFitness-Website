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

export const contact = {
  inquiries: {
    email: 'manager@merrittwellness.net',
    phone: '(720) 357-9499',
    phoneHref: 'tel:720-357-9499',
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

// Merritt Workspace member benefit: included Merritt Wellness venue hours,
// Monday through Friday, 9 AM to 5 PM. Shown side by side on /studio.
export const workspaceMemberHours = {
  window: 'Monday through Friday, 9 AM to 5 PM',
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
