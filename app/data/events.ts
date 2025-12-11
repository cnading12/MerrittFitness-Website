export interface Event {
  id: string;
  title: string;
  date: string; // ISO format: YYYY-MM-DD
  time: string; // e.g., "7:00 PM"
  endTime?: string; // Optional end time
  description: string;
  imageUrl: string;
  ticketUrl: string;
  instagramHandle?: string; // Without @ symbol
  practitionerName?: string;
}

// Add your events here - events with dates in the past will be automatically filtered out
export const events: Event[] = [
  {
    id: "winter-solstice-sound-bath-2024",
    title: "Winter Solstice Sound Bath",
    date: "2025-12-21",
    time: "7:00 PM",
    endTime: "9:00 PM",
    description: "Celebrate the longest night of the year with a deeply restorative sound bath experience. Crystal bowls, gongs, and ambient soundscapes will guide you through a meditative journey as we honor the return of the light.",
    imageUrl: "/images/hero/1.jpg",
    ticketUrl: "https://example.com/tickets/winter-solstice",
    instagramHandle: "merritt.fitness",
    practitionerName: "Sarah Mitchell"
  },
  {
    id: "new-year-intention-setting-2025",
    title: "New Year Intention Setting Workshop",
    date: "2025-01-04",
    time: "10:00 AM",
    endTime: "12:30 PM",
    description: "Begin 2025 with clarity and purpose. This intimate workshop combines gentle yoga, guided meditation, and journaling exercises to help you craft meaningful intentions for the year ahead.",
    imageUrl: "/images/hero/outside3.jpg",
    ticketUrl: "https://example.com/tickets/new-year-intentions",
    instagramHandle: "merritt.fitness",
    practitionerName: "Emma Chen"
  },
  {
    id: "breathwork-journey-jan-2025",
    title: "Breathwork Journey: Release & Renew",
    date: "2025-01-18",
    time: "6:30 PM",
    endTime: "8:30 PM",
    description: "Experience the transformative power of conscious breathwork in our sacred space. This evening session will guide you through powerful breathing techniques designed to release tension, expand awareness, and reconnect with your inner wisdom.",
    imageUrl: "/images/hero/1.jpg",
    ticketUrl: "https://example.com/tickets/breathwork-journey",
    practitionerName: "David Reyes"
  }
];
