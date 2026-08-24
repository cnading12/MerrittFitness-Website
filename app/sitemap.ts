import type { MetadataRoute } from 'next';
import { events } from '@/app/data/events';

const BASE_URL = 'https://www.merrittwellness.net';

/**
 * The most recent date any published event was scheduled for. Used as the
 * `lastModified` for /calendar so that page's freshness signal tracks the
 * actual programme rather than "whenever the site last built".
 */
function latestEventDate(): Date {
  const dates = events
    .map((event) => new Date(`${event.endDate || event.date}T00:00:00`))
    .filter((date) => !Number.isNaN(date.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date();
  const calendarDate = latestEventDate();

  // priority is a relative hint within this site only — it says nothing to
  // Google about how this site ranks against others. The ordering below
  // mirrors where the business actually wants traffic: the wellness and
  // movement partnership pages are the priority, then weddings and private
  // events, then the niche event types.
  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
    lastModified?: Date;
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },

    // Wellness & movement partnerships — the priority line.
    { path: '/class-partnerships', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/recurring', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/calendar', changeFrequency: 'weekly', priority: 0.9, lastModified: calendarDate },

    // Highest-value one-off bookings.
    { path: '/weddings', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/private-events', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/book', changeFrequency: 'monthly', priority: 0.8 },

    // Niche event types — lower competition, real conversion.
    { path: '/concerts', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/art-shows', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/congregations', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/studio', changeFrequency: 'monthly', priority: 0.8 },

    // The single-page factual reference. High priority despite not selling
    // anything: it is the page an assistant answering "what's a good event
    // space in Denver?" can extract a whole recommendation from, and the one
    // /llms.txt points at first. See app/venue-facts/page.tsx.
    { path: '/venue-facts', changeFrequency: 'monthly', priority: 0.8 },

    // Supporting pages.
    { path: '/about', changeFrequency: 'yearly', priority: 0.6 },
    { path: '/contact', changeFrequency: 'yearly', priority: 0.6 },

    // Pending photography; add when the dedicated pages ship:
    // '/celebrations-of-life', '/parties', '/corporate'
  ];

  return routes.map(({ path, changeFrequency, priority, lastModified }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: lastModified || buildDate,
    changeFrequency,
    priority,
  }));
}
