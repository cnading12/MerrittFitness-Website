// Shared venue facts for the marketing pages (weddings, private events,
// class partnerships, congregations, studio). One source of truth so specs,
// policies, and contact routing never drift between pages.
//
// Pricing figures are NOT hardcoded here — they are derived from the same
// constants the booking engine bills with (app/lib/booking-pricing.js) via
// buildPricing() below. If a rate changes in the engine, every marketing page
// updates with it.

import {
  HOURLY_RATE,
  SATURDAY_RATE,
  RATE_TIER_INCREMENT,
  SATURDAY_RATE_INCREMENT,
  EXTENDED_BOOKING_DISCOUNT,
  EXTENDED_BOOKING_DISCOUNT_MIN_HOURS,
  RECURRING_VOLUME_DISCOUNT,
  RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
  ON_SITE_ASSISTANCE_FEE,
  EVENT_SUPERVISION_RATE,
  EVENT_SUPERVISION_GROUP_THRESHOLD,
  TABLES_CHAIRS_FEE_SMALL,
  TABLES_CHAIRS_FEE_LARGE,
  TABLES_CHAIRS_GROUP_THRESHOLD,
  MAT_RENTAL_FEE,
  DIVIDER_REMOVAL_FEE,
} from '@/app/lib/booking-pricing.js';

export const VENUE = {
  name: 'Merritt Wellness',
  url: 'https://merrittwellness.net',
  // New-event inquiries go to the manager. clientservices@ is reserved for
  // clients with an existing booking — never route new inquiries there.
  phone: '720-357-9499',
  phoneDisplay: '(720) 357-9499',
  phoneIntl: '+1-720-357-9499',
  email: 'manager@merrittwellness.net',
  address: {
    street: '2246 Irving St',
    city: 'Denver',
    state: 'CO',
    zip: '80211',
    neighborhood: 'Sloans Lake',
  },
  geo: {
    latitude: 39.750981971554395,
    longitude: -105.03225422320789,
  },
  social: {
    instagram: 'https://www.instagram.com/merrittwellnessdenver',
    facebook: 'https://www.facebook.com/MerrittWellnessDenver/',
  },
  // Sibling coworking property next door. Link to it; never duplicate its
  // pricing or inventory here — they change independently of this codebase.
  workspaceUrl: 'https://merrittworkspace.net',
  workspaceName: 'Merritt Workspace',
} as const;

export const SPECS = {
  capacity: 125,
  mainHallSqFt: 1100,
  upstairsSqFt: 1600,
  totalSqFt: 2400,
  parkingSpots: 22,
  ceilingFeet: 24,
  built: 1905,
} as const;

// Stated once per page, in the policies section — not repeated across
// sections, not led with.
export const POLICIES = [
  {
    label: 'Alcohol',
    text: 'BYOB is allowed. Any event with alcohol requires a certificate of insurance for general liability. If alcohol is being served, it must be served by a TIPS-certified bartender. Alcohol cannot be sold on premises.',
  },
  {
    label: 'End time',
    text: 'Events end by 10 PM.',
  },
  {
    label: 'Setup and breakdown',
    text: 'Setup and breakdown happen within your booked rental window. The space is returned in the condition you found it.',
  },
  {
    label: 'Accessibility',
    text: `Ramp entry at the front of the building. The main hall restrooms are downstairs and are not ADA accessible; ADA restrooms are available next door at ${VENUE.workspaceName}.`,
  },
  {
    label: 'Live sound',
    text: 'The on-site mixer is restricted to professional sound techs.',
  },
] as const;

export const AMENITIES = [
  'Surround sound system',
  'Projector and screen',
  'Air conditioning',
  'Cafe lounge area',
  'Breakout rooms',
  'Downstairs getting-ready space',
  '22 on-site parking spots',
] as const;

const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// Pricing display model, computed from the booking engine's constants.
// Discount rows always carry both the percentage and the dollar result.
export function buildPricing() {
  const tiers = [
    { guests: '0–30 guests', weekday: HOURLY_RATE, saturday: SATURDAY_RATE },
    {
      guests: '30–60 guests',
      weekday: HOURLY_RATE + RATE_TIER_INCREMENT,
      saturday: SATURDAY_RATE + SATURDAY_RATE_INCREMENT,
    },
    {
      guests: '60+ guests',
      weekday: HOURLY_RATE + 2 * RATE_TIER_INCREMENT,
      saturday: SATURDAY_RATE + 2 * SATURDAY_RATE_INCREMENT,
    },
  ].map((t) => ({
    guests: t.guests,
    weekday: dollars(t.weekday),
    saturday: dollars(t.saturday),
    weekdayRecurring: dollars(t.weekday * (1 - RECURRING_VOLUME_DISCOUNT)),
    saturdayRecurring: dollars(t.saturday * (1 - RECURRING_VOLUME_DISCOUNT)),
  }));

  const extendedPct = EXTENDED_BOOKING_DISCOUNT * 100;
  // Worked example for the extended discount: an 8-hour Saturday event at the
  // top band, so the percentage always appears next to a dollar figure.
  const topSaturday = SATURDAY_RATE + 2 * SATURDAY_RATE_INCREMENT;
  const exampleHours = EXTENDED_BOOKING_DISCOUNT_MIN_HOURS;
  const exampleBase = topSaturday * exampleHours;
  const exampleTotal = exampleBase * (1 - EXTENDED_BOOKING_DISCOUNT);

  return {
    tiers,
    minimumHours: 2,
    extended: {
      pct: extendedPct,
      minHours: EXTENDED_BOOKING_DISCOUNT_MIN_HOURS,
      example: `an ${exampleHours}-hour Saturday event for 60+ guests is ${dollars(exampleBase)} before the discount and ${dollars(exampleTotal)} with it`,
    },
    recurring: {
      pct: RECURRING_VOLUME_DISCOUNT * 100,
      minMonthlyHours: RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
      exampleWeekday: `${dollars(HOURLY_RATE)}/hour becomes ${dollars(HOURLY_RATE * (1 - RECURRING_VOLUME_DISCOUNT))}/hour`,
    },
    staffing: {
      onboardingFee: dollars(ON_SITE_ASSISTANCE_FEE),
      supervisionRate: dollars(EVENT_SUPERVISION_RATE),
      supervisionThreshold: EVENT_SUPERVISION_GROUP_THRESHOLD,
    },
    equipment: {
      tablesChairsSmall: dollars(TABLES_CHAIRS_FEE_SMALL),
      tablesChairsLarge: dollars(TABLES_CHAIRS_FEE_LARGE),
      tablesChairsThreshold: TABLES_CHAIRS_GROUP_THRESHOLD,
      mat: dollars(MAT_RENTAL_FEE),
      dividerRemoval: dollars(DIVIDER_REMOVAL_FEE),
    },
  };
}

export type VenuePricing = ReturnType<typeof buildPricing>;
