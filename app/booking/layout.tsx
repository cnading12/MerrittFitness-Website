import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Yoga, Sound Baths & Wellness Classes | Merritt Wellness Denver Sloans Lake',
  description: 'Book yoga classes, sound bath sessions, meditation retreats, and wellness events at Merritt Wellness in Sloans Lake Denver. Historic 1905 venue with 24-foot ceilings, perfect acoustics. $95/hour. Call (720) 357-9499.',
  keywords: 'book yoga class Denver, sound bath Denver booking, meditation class reservation Denver, wellness event space rental Denver, yoga studio rental Sloans Lake, sound healing session Denver, book wellness retreat Denver, private yoga session Denver, group meditation Denver, holistic healing Denver, mindfulness class Denver, breathwork session Denver, Denver yoga reservation, wellness workshop Denver',
  openGraph: {
    title: 'Book Your Wellness Experience | Merritt Wellness Denver',
    description: 'Reserve yoga, sound baths, meditation & wellness events at our historic 1905 venue in Sloans Lake Denver. $95/hour with flexible booking.',
    url: 'https://merrittwellness.net/booking',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://merrittwellness.net/images/hero/1.jpg',
        width: 1200,
        height: 630,
        alt: 'Merritt Wellness interior - yoga and meditation space in Denver',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book Yoga & Sound Baths | Merritt Wellness Denver',
    description: 'Reserve your wellness experience at our historic venue in Sloans Lake. Yoga, sound baths, meditation & more.',
    images: ['https://merrittwellness.net/images/hero/1.jpg'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/booking',
  },
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
