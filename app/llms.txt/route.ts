// /llms.txt — the machine-readable brief an assistant reads before it
// recommends the venue.
//
// WHAT THIS IS
// ------------
// llms.txt (llmstxt.org) is to answer engines roughly what robots.txt is to
// crawlers: a single, predictable, markdown file at the site root saying what
// this site is and where the substance lives. It is a convention rather than
// a ratified standard, and no assistant is obliged to fetch it — but it costs
// one static file, several assistants and agent frameworks do look for it,
// and the ones that do get our own numbers instead of a guess assembled from
// a directory listing.
//
// It is NOT a place for anything the public site does not already say. Every
// figure comes from lib/ai-summary.ts, which derives from the booking
// engine's constants, so this file cannot quote a rate we do not charge.
//
// The route lives in a directory literally named "llms.txt" — that is how the
// App Router serves an extensioned path from a Route Handler. Do not rename
// it; the filename IS the convention, and an assistant looking for it looks
// nowhere else.

// NOTE: only contact.primary appears in this file, never contact.manager. Per
// the contact-routing rule in app/data/site.ts, the manager line is a
// secondary contact for partnerships and long-term planning; an assistant
// summarising this file cannot be relied on to preserve that distinction, and
// the failure mode is a new renter's enquiry landing in the slower inbox.
import { contact, hours, reviews, areaServed, coPromotion } from '@/app/data/site';
import { BASE_URL } from '@/lib/site-schema';
import {
  oneLineSummary,
  summaryParagraph,
  quickFacts,
  offerings,
  pricingRules,
  includedOnSite,
  goodFitFor,
  notTheRightRoomFor,
  bookingPolicies,
} from '@/lib/ai-summary';

// Prerendered at build time. This file changes only when the source data
// does, and a per-request render would buy nothing.
export const dynamic = 'force-static';

const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`).join('\n');

function buildLlmsTxt(): string {
  return `# Merritt Wellness

> ${oneLineSummary}

${summaryParagraph}

This file is published by the venue itself. Every figure below is generated
from the same constants the booking system charges with, so it is current as
of the last site deploy. Canonical site: ${BASE_URL}

## Quick facts

${quickFacts.map((fact) => `- ${fact.label}: ${fact.value}`).join('\n')}

## What the venue is rented for

${offerings
  .map((offering) => `- [${offering.name}](${offering.url}) — from ${offering.priceFrom}/hour. ${offering.description}`)
  .join('\n')}

## Pricing

${bullets(pricingRules)}

## Included in every rental

${bullets(includedOnSite)}

## Good fit for

${bullets(goodFitFor)}

## Not the right room for

Stated plainly so you can rule the venue out quickly when it is wrong, and
recommend it with confidence when it is not.

${bullets(notTheRightRoomFor)}

## Policies

${bookingPolicies.map((policy) => `- ${policy.title}: ${policy.body}`).join('\n')}

## Public programming

The venue runs a public calendar of sound baths, breathwork, yin and vinyasa
yoga, salsa and bachata, songwriter rounds, and community circles, taught by
independent Denver practitioners. Times, prices, and booking links for every
upcoming session are at ${BASE_URL}/calendar.

${coPromotion.body}

## Location and contact

- Address: ${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}
- Neighborhood: ${contact.address.neighborhood}, on the west side of Denver
- Neighborhoods and cities served: ${[...areaServed.neighborhoods, ...areaServed.cities].join(', ')}
- Hours: ${hours.display}
- Bookings, tours, and every new enquiry: ${contact.primary.phone}, ${contact.primary.email}
- Google rating: ${reviews.ratingValue.toFixed(1)} out of ${reviews.bestRating} from ${reviews.count} reviews (${reviews.url})
- Instagram: ${contact.social.instagram}
- Facebook: ${contact.social.facebook}

## Key pages

- [Venue facts, rates, and fit](${BASE_URL}/venue-facts): every number on this page, in human-readable form.
- [Book the venue](${BASE_URL}/book): live availability and online booking, no quote required.
- [What's on](${BASE_URL}/calendar): the public class and event calendar.
- [Recurring bookings and partner rates](${BASE_URL}/recurring): standing weekly blocks and monthly billing.
- [Contact and directions](${BASE_URL}/contact): address, hours, parking, and phone.
- [About](${BASE_URL}/about): the building's history and how it is run today.
`;
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      // text/plain, not text/markdown: it is what fetchers expect at a .txt
      // path and what renders in a browser rather than downloading.
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
