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
    endTime: "9:30 AM",
    description: "Join this welcoming Sunday morning service held in our beautiful historic sanctuary. While Merritt Wellness is a non-denominational space open to all practices and beliefs, we're honored to host this lovely congregation each week. All are welcome.",
    imageUrl: "/images/hero/1.jpg",
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
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Steven Benoy"
  },
  {
    id: "neighborhood-meeting-dec-2025",
    title: "Monthly Neighborhood Meeting",
    date: "2025-12-16",
    time: "4:00 PM",
    endTime: "8:00 PM",
    description: "Join us each month for our neighborhood association planning meeting, led by Adam Levy. This is a free, community-focused gathering where neighbors come together to discuss local updates, upcoming initiatives, and ways to strengthen our area. We're proud to host and support our neighborhood—everyone is welcome.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Adam Levy",
    recurrence: "Third Tuesday of every month"
  },
  {
    id: "katrina-born-event-dec-2025",
    title: "Katrina Born Event",
    date: "2025-12-20",
    time: "5:00 PM",
    endTime: "7:00 PM",
    description: "PLACEHOLDER - Need description for this event.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Katrina Born"
  },
  
  // ============ JANUARY 2026 ============
  {
    id: "genoa-full-circle-jan-1-2026",
    title: "Full Circle with Genoa",
    date: "2026-01-01",
    time: "4:00 PM",
    endTime: "6:00 PM",
    description: "Start the new year with Full Circle, a weekly gathering led by Genoa. PLACEHOLDER - Need more details about what this practice involves.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },
  {
    id: "genoa-full-circle-jan-8-2026",
    title: "Full Circle with Genoa",
    date: "2026-01-08",
    time: "4:00 PM",
    endTime: "6:00 PM",
    description: "Join Genoa for Full Circle, a weekly gathering held every Thursday. PLACEHOLDER - Need more details about what this practice involves.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },
  {
    id: "manuela-stephanie-yoga-jan-2026",
    title: "Yoga with Manuela & Stephanie",
    date: "2026-01-10",
    time: "5:00 PM",
    endTime: "7:00 PM",
    description: "A special yoga session co-led by Manuela and Stephanie. Experience the unique energy of two practitioners guiding you through practice in our sacred historic space.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Manuela & Stephanie"
  },
  {
    id: "genoa-full-circle-jan-15-2026",
    title: "Full Circle with Genoa",
    date: "2026-01-15",
    time: "4:00 PM",
    endTime: "6:00 PM",
    description: "Join Genoa for Full Circle, a weekly gathering held every Thursday. PLACEHOLDER - Need more details about what this practice involves.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },
  {
    id: "kerri-drumm-church-jan-2026",
    title: "Kerri Drumm Church Event",
    date: "2026-01-16",
    time: "9:00 AM",
    endTime: "12:00 PM",
    description: "PLACEHOLDER - Need description for this event with Kerri Drumm.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Kerri Drumm"
  },
  {
    id: "chris-kelsie-event-jan-2026",
    title: "Chris and Kelsie Event",
    date: "2026-01-17",
    time: "5:30 PM",
    endTime: "7:30 PM",
    description: "PLACEHOLDER - Need description for this event.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Chris and Kelsie"
  },
  {
    id: "neighborhood-meeting-jan-2026",
    title: "Monthly Neighborhood Meeting",
    date: "2026-01-20",
    time: "4:00 PM",
    endTime: "8:00 PM",
    description: "Join us each month for our neighborhood association planning meeting, led by Adam Levy. This is a free, community-focused gathering where neighbors come together to discuss local updates, upcoming initiatives, and ways to strengthen our area. We're proud to host and support our neighborhood—everyone is welcome.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Adam Levy",
    recurrence: "Third Tuesday of every month"
  },
  {
    id: "genoa-full-circle-jan-22-2026",
    title: "Full Circle with Genoa",
    date: "2026-01-22",
    time: "4:00 PM",
    endTime: "6:00 PM",
    description: "Join Genoa for Full Circle, a weekly gathering held every Thursday. PLACEHOLDER - Need more details about what this practice involves.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },
  {
    id: "cynthia-artists-amongst-us-jan-24-2026",
    title: "Artists Amongst Us",
    date: "2026-01-24",
    time: "5:00 PM",
    endTime: "7:00 PM",
    description: "An evening celebrating local artists and creative expression, hosted by Cynthia. PLACEHOLDER - Need more details about this event series.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Cynthia"
  },
  {
    id: "genoa-full-circle-jan-29-2026",
    title: "Full Circle with Genoa",
    date: "2026-01-29",
    time: "4:00 PM",
    endTime: "6:00 PM",
    description: "Join Genoa for Full Circle, a weekly gathering held every Thursday. PLACEHOLDER - Need more details about what this practice involves.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },
  {
    id: "cynthia-artists-amongst-us-jan-30-2026",
    title: "Artists Amongst Us",
    date: "2026-01-30",
    time: "6:30 PM",
    endTime: "8:30 PM",
    description: "An evening celebrating local artists and creative expression, hosted by Cynthia. PLACEHOLDER - Need more details about this event series.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Cynthia"
  },
  {
    id: "cynthia-artists-amongst-us-jan-31-2026",
    title: "Artists Amongst Us",
    date: "2026-01-31",
    time: "12:00 PM",
    endTime: "2:00 PM",
    description: "An afternoon celebrating local artists and creative expression, hosted by Cynthia. PLACEHOLDER - Need more details about this event series.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Cynthia"
  }
];