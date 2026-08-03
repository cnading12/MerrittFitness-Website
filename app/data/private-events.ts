// Event-type content blocks for the private-events side of the site.
//
// Types with `href` have (or will have) a dedicated page; the rest are
// covered in prose on /private-events until usable photography exists.
// Each block is self-contained so a section can be lifted straight into its
// own route later without rewriting /private-events.
//
// PENDING ROUTES (waiting on photography — do not build until photos exist):
//   /celebrations-of-life  -> celebrations-of-life + memorials blocks below
//   /parties               -> parties/milestones blocks (quinceañeras,
//                             birthdays, showers, graduations)
//   /corporate             -> corporate offsites block

export interface EventTypeBlock {
  slug: string;
  name: string;
  // Set when a dedicated page exists. Blocks without an href render as prose
  // sections on /private-events only.
  href?: string;
  description: string;
}

export const EVENT_TYPES: EventTypeBlock[] = [
  {
    slug: 'weddings',
    name: 'Weddings',
    href: '/weddings',
    description:
      'Ceremonies and receptions for up to 125 guests under 24-foot cathedral ceilings, with original stained glass and hardwood floors that photograph beautifully without heavy decor.',
  },
  {
    slug: 'concerts',
    name: 'Concerts & Performances',
    href: '/concerts',
    description:
      'An intimate listening room with natural sanctuary acoustics, a surround sound system, and space for seated or standing audiences.',
  },
  {
    slug: 'art-shows',
    name: 'Art Shows & Exhibitions',
    href: '/art-shows',
    description:
      'Gallery walls, track lighting, and a warm architectural backdrop for openings, exhibitions, and markets.',
  },
  {
    slug: 'celebrations-of-life',
    name: 'Celebrations of Life & Memorials',
    // Pending photography: /celebrations-of-life
    description:
      'A century-old sanctuary holds a room full of people remembering someone well. Families use the main hall for the service and the cafe lounge for gathering afterward, with time built in for both.',
  },
  {
    slug: 'quinceaneras',
    name: 'Quinceañeras',
    // Pending photography: /parties
    description:
      'A dramatic setting for the ceremony and photos, with room for dinner and dancing to follow. The building holds up to 125 guests.',
  },
  {
    slug: 'birthdays-showers',
    name: 'Birthdays, Showers & Graduations',
    // Pending photography: /parties
    description:
      'Milestone parties of every kind: birthday dinners, baby and bridal showers, graduation celebrations. The cafe lounge suits smaller gatherings; the main hall opens up for bigger ones.',
  },
  {
    slug: 'corporate',
    name: 'Corporate Offsites & Retreats',
    // Pending photography: /corporate
    description:
      'A day away from the office that does not feel like a conference room: projector and screen, breakout rooms, a cafe lounge for breaks, and 22 on-site parking spots.',
  },
];
