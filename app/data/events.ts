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
  {
    id: "monthly-neoghborhood-events-2024",
    title: "Monthly Neighborhood Meeting",
    date: "2025-12-16",
    time: "4:00 PM",
    endTime: "8:00 PM",
    description: "Join us each month for our neighborhood association planning meeting, led by Adam Levy. This is a free, community-focused gathering where neighbors come together to discuss local updates, upcoming initiatives, and ways to strengthen our area. We’re proud to host and support our neighborhood—everyone is welcome.",
    imageUrl: "/images/hero/1.jpg",
    practitionerName: "Adam Levy",
    recurrence: "Third Tuesday of every month"
  },
  {
    id: "new-year-intention-setting-2026",
    title: "New Year Intention Setting Workshop",
    date: "2026-01-04",
    time: "10:00 AM",
    endTime: "12:30 PM",
    description: "Begin 2026 with clarity and purpose. This intimate workshop combines gentle yoga, guided meditation, and journaling exercises to help you craft meaningful intentions for the year ahead.",
    imageUrl: "/images/hero/outside3.jpg",
    ticketUrl: "https://example.com/tickets/new-year-intentions",
    instagramHandle: "merritt.fitness",
    practitionerName: "Emma Chen"
  },
  {
    id: "breathwork-journey-jan-2026",
    title: "Breathwork Journey: Release & Renew",
    date: "2026-01-17",
    time: "6:30 PM",
    endTime: "8:30 PM",
    description: "Experience the transformative power of conscious breathwork in our sacred space. This evening session will guide you through powerful breathing techniques designed to release tension, expand awareness, and reconnect with your inner wisdom.",
    imageUrl: "/images/hero/1.jpg",
    ticketUrl: "https://example.com/tickets/breathwork-journey",
    practitionerName: "David Reyes",
    recurrence: "Third Saturday of every month"
  }
];
