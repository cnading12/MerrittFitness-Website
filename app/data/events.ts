export interface Event {
  id: string;
  title: string;
  date: string; // ISO format: YYYY-MM-DD
  time: string; // e.g., "7:00 PM"
  endTime?: string; // Optional end time
  description: string;
  imageUrl: string;
  ticketUrl?: string; // Optional - omit for free events
  instagramHandle?: string; // Without @ symbol
  practitionerName?: string;
  recurrence?: string; // e.g., "Every Thursday", "First Saturday of every month"
}

// Add your events here - events with dates in the past will be automatically filtered out
export const events: Event[] = [
  // ============ RECURRING: SUNDAY MORNING SERVICE ============
  {
    id: "sunday-morning-service",
    title: "Sunday Morning Service",
    date: "2025-12-14",
    time: "7:30 AM",
    endTime: "9:30 PM",
    description: "Join this welcoming Sunday morning service held in our beautiful historic sanctuary. While Merritt Wellness is a non-denominational space open to all practices and beliefs, we're honored to host this lovely congregation each week. All are welcome.",
    imageUrl: "/images/events/community/group.JPG",
    recurrence: "Every Sunday"
  },

  // ============ DECEMBER 2025 ============
  {
    id: "steven-benoy-yoga-dec-2025",
    title: "Yoga with Steven Benoy",
    date: "2025-12-11",
    time: "4:30 PM",
    endTime: "6:00 PM",
    description: "Experience a grounding yoga practice led by Steven Benoy in our stunning historic space featuring 24-foot ceilings and original stained glass windows.",
    imageUrl: "/images/events/2.webp",
    ticketUrl: "#",
    practitionerName: "Steven Benoy"
  },
  {
    id: "neighborhood-meeting-dec-2025",
    title: "Monthly Neighborhood Meeting",
    date: "2025-12-16",
    time: "4:00 PM",
    endTime: "8:00 PM",
    description: "Join us each month for our neighborhood association planning meeting, led by Adam Levy. This is a free, community-focused gathering where neighbors come together to discuss local updates, upcoming initiatives, and ways to strengthen our area. We're proud to host and support our neighborhood—everyone is welcome.",
    imageUrl: "/images/events/community/food.JPG",
    practitionerName: "Adam Levy",
    recurrence: "Third Tuesday of every month"
  },
  {
    id: "katrina-born-sound-bath-dec-2025",
    title: "Sound Bath with Katrina Born",
    date: "2025-12-20",
    time: "5:00 PM",
    endTime: "7:00 PM",
    description: "Immerse yourself in the healing vibrations of a sound bath led by Katrina Born. Using crystal singing bowls, gongs, and other resonant instruments, Katrina will guide you into a deep state of relaxation and restoration. Simply lie back and let the sound waves wash over you in our beautiful historic sanctuary with 24-foot ceilings and original stained glass windows.",
    imageUrl: "/images/events/katrina/2.webp",
    ticketUrl: "#",
    instagramHandle: "katrina_born_",
    practitionerName: "Katrina Born"
  },

  // ============ JANUARY 2026 ============
  {
    id: "full-circle-dance",
    title: "Full Circle Dance",
    date: "2026-01-02",
    time: "4:00 PM",
    endTime: "6:30 PM",
    description: "Full Circle Dance offers a heart-centered dance experience for our youngest movers ages 2-8. Led by Genoa, these weekly classes help little dancers explore movement, build confidence, and grow through joy in our bright, welcoming historic space.",
    imageUrl: "/images/events/dance/kids.jpg",
    ticketUrl: "https://www.fullcircle.dance/sloans-lake",
    instagramHandle: "fullcircledancecolorado",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },
  {
    id: "illumination-chris-kelsie-jan-2026",
    title: "Illumination with Chris & Kelsie",
    date: "2026-01-17",
    time: "5:30 PM",
    endTime: "7:30 PM",
    description: "Join Chris and Kelsie for Illumination, a rotating series of wellness experiences in our beautiful historic sanctuary. Each gathering offers something different—from energizing dance parties to grounding meditation and flowing yoga—all designed to help you connect, move, and restore.",
    imageUrl: "/images/events/dance/Event.png",
    ticketUrl: "https://kelsieriffey.com/illumination",
    instagramHandle: "yoga.savage",
    practitionerName: "Chris and Kelsie"
  },
  {
    id: "tantra-speed-date-jan-2026",
    title: "Tantra Speed Date",
    date: "2026-01-10",
    time: "5:30 PM",
    endTime: "9:00 PM",
    description: "Tired of swiping? Try a whole new dating experience—it's like yoga for your love life! Led by Stephanie Miller, this popular monthly gathering brings together singles for an evening of connection, movement, and meaningful conversations in our beautiful historic sanctuary. Use our ticket link for 10% OFF!",
    imageUrl: "/images/events/community/tantra.jpg",
    ticketUrl: "https://www.eventbrite.com/e/tantra-speed-date-denver-meet-singles-speed-dating-tickets-1914191862389?discount=MERRITT10",
    instagramHandle: "tantra_speed_date",
    practitionerName: "Stephanie Miller",
    recurrence: "Second Saturday of every month"
  },
  {
    id: "neighborhood-meeting-jan-2026",
    title: "Monthly Neighborhood Meeting",
    date: "2026-01-20",
    time: "4:00 PM",
    endTime: "8:00 PM",
    description: "Join us each month for our neighborhood association planning meeting, led by Adam Levy. This is a free, community-focused gathering where neighbors come together to discuss local updates, upcoming initiatives, and ways to strengthen our area. We're proud to host and support our neighborhood—everyone is welcome.",
    imageUrl: "/images/events/community/food.JPG",
    practitionerName: "Adam Levy",
    recurrence: "Third Tuesday of every month"
  },
  {
    id: "artists-amongst-us-winter-gala-jan-2026",
    title: "Artists Amongst Us Winter Gala",
    date: "2026-01-24",
    time: "8:00 PM",
    endTime: "12:00 AM",
    description: "Support local art. Support Denver. Join us for an elegant evening celebrating local artists and creative expression. This exclusive gala features a silent auction of art and experiences, giveaways, drinks, and light snacks—followed by a DJ'd afterparty with dancing from 10 PM to midnight. Party attire required—dress to impress! Only 65 seats available.",
    imageUrl: "/images/events/community/gala.png",
    ticketUrl: "https://www.artistsamongstus.org/event-details/winter-gala-launching-a-year-of-art-magic",
    instagramHandle: "artistsamongstusdenver",
    practitionerName: "Artists Amongst Us"
  },
  {
    id: "denver-winter-tango-intensive-jan-2026",
    title: "Denver Winter Tango Intensive",
    date: "2026-01-30",
    time: "January 30–February 1",
    description: "Registration is open! Join us for an immersive weekend of tango with beginner-friendly classes, all-level workshops, and in-depth masterclasses. We'll dive into Versatility in Style, Connection, and Musicality—all tailored specifically for Colorado's social tango dancers. Spots are limited—don't wait. Come dance, train, and kick off 2026 with us!",
    imageUrl: "/images/events/dance/teaching.jpeg",
    ticketUrl: "https://forms.gle/zBepZ9sfJ9npg3gZ6"
  }
];