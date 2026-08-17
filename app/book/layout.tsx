import { Metadata } from 'next'
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/site-schema'
import { rateBands, money, minimumHours } from '@/app/lib/venue-rates'
import { contact, specs } from '@/app/data/site'

// This page's metadata used to describe a yoga studio at a flat "$95/hour".
// Neither held up: the venue books weddings, concerts, art shows, private
// events, and congregations as well as classes, and $95 is only the lowest of
// six published rates. Both were undercutting the higher-value lines in
// search. Figures below come from the booking engine's own constants via
// venue-rates, so they cannot drift from what the checkout actually charges.
const rateSummary = `${money(rateBands[0].weekday)}-${money(
  rateBands[rateBands.length - 1].saturday
)}/hour`

export const metadata: Metadata = {
  title: "Book the Venue | Check Availability & Rates | Merritt Wellness Denver",
  description: `Check real-time availability and book Merritt Wellness, a historic ${specs.built} event venue in Denver's ${contact.address.neighborhood}. Weddings, private events, concerts, workshops, and weekly class blocks for up to ${specs.capacity} guests. Published rates ${rateSummary}, ${minimumHours}-hour minimum. Call ${contact.inquiries.phone}.`,
  keywords: [
    'book event venue Denver',
    "event space rental Sloans Lake",
    'venue availability Denver',
    'hourly venue rental Denver',
    'class space rental Denver',
    'wedding venue booking Denver',
    'workshop space rental Denver',
  ],
  openGraph: {
    title: 'Book the Venue | Merritt Wellness Denver',
    description: `Check availability and book a historic ${specs.built} Denver event venue for up to ${specs.capacity} guests. Published rates ${rateSummary}, no mystery quotes.`,
    url: 'https://merrittwellness.net/book',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://merrittwellness.net/images/pages/venue/main-hall-rose-window.webp',
        width: 1800,
        height: 2400,
        alt: 'The main hall of the restored 1905 sanctuary, with a rose window and five arched stained-glass windows above a polished wood floor',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book the Venue | Merritt Wellness Denver',
    description: `Check availability and book a historic Denver event venue for up to ${specs.capacity} guests. Published rates ${rateSummary}.`,
    images: ['https://merrittwellness.net/images/pages/venue/main-hall-rose-window.webp'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/book',
  },
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Rendered from the layout because app/book/page.tsx is a client component.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd('/book', [{ name: 'Book the Venue' }])
        )}
      />
      {children}
    </>
  )
}
