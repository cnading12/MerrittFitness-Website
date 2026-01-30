'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { events, Event } from '@/app/data/events';
import { Calendar, Clock, Ticket, Instagram, Repeat, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

type DateRange = 'lastMonth' | 'thisMonth' | 'nextMonth';

// Format date elegantly: "Saturday, December 21"
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Get short month and day for badge: { month: "DEC", day: "21" }
function getDateParts(dateString: string): { month: string; day: string } {
  const date = new Date(dateString + 'T00:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate().toString();
  return { month, day };
}

// Get date range boundaries using actual calendar months
function getDateRange(range: DateRange): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start: Date;
  let end: Date;

  switch (range) {
    case 'lastMonth':
      // First day to last day of previous calendar month
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0); // Day 0 = last day of prev month
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      // First day to last day of current calendar month
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Day 0 = last day of current month
      end.setHours(23, 59, 59, 999);
      break;
    case 'nextMonth':
      // First day to last day of next calendar month
      start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Day 0 = last day of next month
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

// Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
const dayNameToNumber: { [key: string]: number } = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};

// Map ordinal words to numbers
const ordinalToNumber: { [key: string]: number } = {
  'first': 1,
  'second': 2,
  'third': 3,
  'fourth': 4,
  'last': -1,
};

// Get the Nth occurrence of a weekday in a given month
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date | null {
  if (n === -1) {
    // Last occurrence: start from end of month and work backwards
    const lastDay = new Date(year, month + 1, 0);
    const current = new Date(lastDay);
    while (current.getDay() !== weekday) {
      current.setDate(current.getDate() - 1);
    }
    return current;
  }

  // Find first occurrence of the weekday in the month
  const firstOfMonth = new Date(year, month, 1);
  let current = new Date(firstOfMonth);
  while (current.getDay() !== weekday) {
    current.setDate(current.getDate() + 1);
  }

  // Move to Nth occurrence
  current.setDate(current.getDate() + (n - 1) * 7);

  // Verify we're still in the same month
  if (current.getMonth() !== month) {
    return null;
  }

  return current;
}

// Expand recurring events into individual instances within a date range
function expandRecurringEvents(allEvents: Event[], start: Date, end: Date): Event[] {
  const expandedEvents: Event[] = [];

  for (const event of allEvents) {
    // Check if this is a weekly recurring event (e.g., "Every Thursday")
    const weeklyMatch = event.recurrence?.match(/^Every\s+(\w+)$/i);
    // Check if this is a monthly recurring event (e.g., "First Saturday of every month")
    const monthlyMatch = event.recurrence?.match(/^(\w+)\s+(\w+)\s+of\s+every\s+month$/i);

    if (weeklyMatch) {
      const dayName = weeklyMatch[1].toLowerCase();
      const targetDay = dayNameToNumber[dayName];

      if (targetDay !== undefined) {
        // Generate instances for each occurrence of this day within the date range
        const current = new Date(start);

        // Find the first occurrence of the target day in the range
        while (current.getDay() !== targetDay) {
          current.setDate(current.getDate() + 1);
        }

        // Generate an event for each week
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          expandedEvents.push({
            ...event,
            id: `${event.id}-${dateStr}`,
            date: dateStr,
          });
          current.setDate(current.getDate() + 7);
        }
      } else {
        // Unknown day name, keep original event
        expandedEvents.push(event);
      }
    } else if (monthlyMatch) {
      const ordinal = monthlyMatch[1].toLowerCase();
      const dayName = monthlyMatch[2].toLowerCase();
      const targetDay = dayNameToNumber[dayName];
      const nthOccurrence = ordinalToNumber[ordinal];

      if (targetDay !== undefined && nthOccurrence !== undefined) {
        // Generate instances for each month in the range
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

        const current = new Date(startMonth);
        while (current <= endMonth) {
          const eventDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), targetDay, nthOccurrence);

          if (eventDate && eventDate >= start && eventDate <= end) {
            const dateStr = eventDate.toISOString().split('T')[0];
            expandedEvents.push({
              ...event,
              id: `${event.id}-${dateStr}`,
              date: dateStr,
            });
          }

          // Move to next month
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        // Unknown ordinal or day name, keep original event
        expandedEvents.push(event);
      }
    } else {
      // Not a recurring event, keep as-is
      expandedEvents.push(event);
    }
  }

  return expandedEvents;
}

// Filter and sort events by date range
function getFilteredEvents(allEvents: Event[], range: DateRange): Event[] {
  const { start, end } = getDateRange(range);

  // First expand recurring events (weekly and monthly)
  const expandedEvents = expandRecurringEvents(allEvents, start, end);

  return expandedEvents
    .filter((event) => {
      const eventDate = new Date(event.date + 'T00:00:00');
      return eventDate >= start && eventDate <= end;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T00:00:00');
      const dateB = new Date(b.date + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });
}

function EventCard({ event }: { event: Event }) {
  const { month, day } = getDateParts(event.date);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 flex flex-col h-full">
      {/* Image with date badge */}
      <div className="relative aspect-[16/10] overflow-hidden flex-shrink-0">
        <Image
          src={event.imageUrl}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ objectPosition: event.imagePosition || 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Date badge */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-lg">
          <div className="text-xs font-bold text-[#735e59] tracking-wider">{month}</div>
          <div className="text-2xl font-bold text-[#4a3f3c] leading-none font-serif">{day}</div>
        </div>

        {/* Free event badge */}
        {!event.ticketUrl && (
          <div className="absolute top-4 right-4 bg-emerald-500/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-center shadow-lg">
            <span className="text-xs font-bold text-white tracking-wide">FREE</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 flex flex-col flex-grow">
        {/* Time */}
        <div className="flex items-center gap-2 text-[#735e59] text-sm mb-3">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {event.time}
            {event.endTime && ` - ${event.endTime}`}
          </span>
        </div>

        {/* Recurrence badge */}
        {event.recurrence && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#735e59]/10 text-[#735e59] text-xs font-semibold rounded-full mb-3 self-start">
            <Repeat className="w-3 h-3" />
            {event.recurrence}
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-[#4a3f3c] mb-3 font-serif group-hover:text-[#735e59] transition-colors duration-300 leading-tight">
          {event.title}
        </h3>

        {/* Description with Read More */}
        <div className="mb-6 flex-grow">
          <p className={`text-[#6b5f5b] leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {event.description}
          </p>
          {event.description.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[#735e59] text-sm font-medium mt-2 hover:text-[#5a4a46] transition-colors"
            >
              {isExpanded ? (
                <>
                  Read less
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Read more
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Practitioner info if available */}
        {event.practitionerName && (
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#735e59]/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#735e59]/20 to-[#735e59]/10 flex items-center justify-center">
              <span className="text-[#735e59] font-semibold text-sm">
                {event.practitionerName.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#4a3f3c]">{event.practitionerName}</p>
              {event.instagramHandle && (
                <a
                  href={`https://instagram.com/${event.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#735e59] hover:text-[#5a4a46] transition-colors"
                >
                  <Instagram className="w-3 h-3" />
                  @{event.instagramHandle}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Actions - pushed to bottom */}
        <div className="flex items-center gap-3 mt-auto">
          {event.ticketUrl ? (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#735e59] text-[#f2eee9] font-semibold px-6 py-3.5 rounded-xl hover:bg-[#5a4a46] transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
            >
              <Ticket className="w-4 h-4" />
              Get Tickets
            </a>
          ) : (
            <div className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-3.5 rounded-xl">
              <Calendar className="w-4 h-4" />
              Free Event
            </div>
          )}

          {event.instagramHandle && !event.practitionerName && (
            <a
              href={`https://instagram.com/${event.instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-[#735e59]/20 text-[#735e59] hover:bg-[#735e59] hover:text-[#f2eee9] hover:border-[#735e59] transition-all duration-300"
              aria-label={`Follow @${event.instagramHandle} on Instagram`}
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ dateRange }: { dateRange: DateRange }) {
  const messages = {
    lastMonth: {
      title: 'No Past Events',
      description: 'There were no events last month. Check out what\'s coming up!'
    },
    thisMonth: {
      title: 'No Upcoming Events',
      description: 'We\'re currently planning our next series of transformative experiences. Check back soon or follow us on Instagram for announcements.'
    },
    nextMonth: {
      title: 'No Events Scheduled Yet',
      description: 'We haven\'t scheduled events that far out yet. Check back soon or follow us on Instagram for announcements.'
    }
  };

  const { title, description } = messages[dateRange];

  return (
    <div className="text-center py-16 px-6">
      <div className="w-20 h-20 bg-gradient-to-br from-[#735e59]/20 to-[#735e59]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Calendar className="w-10 h-10 text-[#735e59]" />
      </div>
      <h3 className="text-2xl font-bold text-[#4a3f3c] mb-3 font-serif">
        {title}
      </h3>
      <p className="text-[#6b5f5b] max-w-md mx-auto mb-8 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-[#735e59] text-[#f2eee9] font-semibold px-8 py-4 rounded-xl hover:bg-[#5a4a46] transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
        >
          Get Notified
        </Link>
        <a
          href="https://instagram.com/merrittwellnessdenver"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border-2 border-[#735e59] text-[#735e59] font-semibold px-8 py-4 rounded-xl hover:bg-[#735e59] hover:text-[#f2eee9] transition-all duration-300"
        >
          <Instagram className="w-5 h-5" />
          Follow Us
        </a>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
  const filteredEvents = getFilteredEvents(events, dateRange);

  const rangeLabels = {
    lastMonth: { label: 'Last Month', count: 'past' },
    thisMonth: { label: 'This Month', count: 'upcoming' },
    nextMonth: { label: 'Next Month', count: 'scheduled' }
  };

  return (
    <>
      <main className="bg-[#faf8f5] font-sans min-h-screen">
        {/* Hero Header */}
        <section className="relative pt-32 pb-16 bg-gradient-to-b from-[#735e59] to-[#735e59]/90 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-[#f2eee9]/30 rounded-full animate-float blur-sm" />
          <div className="absolute top-32 right-16 w-1.5 h-1.5 bg-[#f2eee9]/20 rounded-full animate-float-delay blur-sm" />
          <div className="absolute bottom-12 left-1/4 w-1 h-1 bg-[#f2eee9]/25 rounded-full animate-float-slow blur-sm" />

          <div className="max-w-7xl mx-auto px-6 text-center animate-fade-in-up">
            <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/10 backdrop-blur-sm text-[#f2eee9]/90 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
              <Calendar className="w-4 h-4 mr-2" />
              What's Happening
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-[#f2eee9] leading-tight font-serif mb-4">
              Upcoming
              <span className="block font-bold">Events</span>
            </h1>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#f2eee9]/60 to-transparent mx-auto mb-6" />
            <p className="text-lg md:text-xl text-[#f2eee9]/80 max-w-2xl mx-auto leading-relaxed">
              Join us for transformative experiences in our historic sanctuary
            </p>
          </div>
        </section>

        {/* Events Grid */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            {/* Date Range Filter */}
            <div className="flex items-center justify-center gap-2 mb-12">
              <button
                onClick={() => setDateRange('lastMonth')}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  dateRange === 'lastMonth'
                    ? 'bg-[#735e59] text-[#f2eee9] shadow-lg'
                    : 'bg-white text-[#735e59] border border-[#735e59]/20 hover:border-[#735e59]/40 hover:shadow-md'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Last Month
              </button>
              <button
                onClick={() => setDateRange('thisMonth')}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  dateRange === 'thisMonth'
                    ? 'bg-[#735e59] text-[#f2eee9] shadow-lg'
                    : 'bg-white text-[#735e59] border border-[#735e59]/20 hover:border-[#735e59]/40 hover:shadow-md'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateRange('nextMonth')}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  dateRange === 'nextMonth'
                    ? 'bg-[#735e59] text-[#f2eee9] shadow-lg'
                    : 'bg-white text-[#735e59] border border-[#735e59]/20 hover:border-[#735e59]/40 hover:shadow-md'
                }`}
              >
                Next Month
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {filteredEvents.length > 0 ? (
              <>
                {/* Event count */}
                <p className="text-center text-[#6b5f5b] mb-12">
                  {filteredEvents.length} {rangeLabels[dateRange].count} {filteredEvents.length === 1 ? 'event' : 'events'}
                </p>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState dateRange={dateRange} />
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="pb-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-gradient-to-br from-[#735e59] to-[#5a4a46] rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 left-4 w-32 h-32 border border-[#f2eee9] rounded-full" />
                <div className="absolute bottom-4 right-4 w-48 h-48 border border-[#f2eee9] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[#f2eee9] rounded-full" />
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-light text-[#f2eee9] mb-4 font-serif">
                  Want to Host an Event?
                </h2>
                <p className="text-[#f2eee9]/80 mb-8 max-w-xl mx-auto leading-relaxed">
                  Our historic 1905 venue is available for wellness workshops, retreats,
                  and community gatherings. Let's create something beautiful together.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-[#f2eee9] text-[#735e59] font-semibold px-8 py-4 rounded-xl hover:bg-white transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                >
                  Get in Touch
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delay {
          animation: float-delay 8s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out 0.3s both;
        }
      `}</style>
    </>
  );
}
