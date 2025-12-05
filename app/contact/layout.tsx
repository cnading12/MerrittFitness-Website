import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Merritt Wellness - Yoga & Sound Bath Studio in Sloans Lake Denver CO',
  description: 'Contact Merritt Wellness at 2246 Irving St, Denver CO 80211 near Sloans Lake. Book yoga classes, sound baths, meditation sessions, and wellness events. Call (720) 357-9499 or email manager@merrittwellness.net.',
  keywords: 'contact Merritt Wellness, yoga studio Denver contact, wellness center phone number, book yoga class Denver, Sloans Lake yoga studio address, Denver sound bath booking, meditation class Denver Colorado, wellness event inquiry Denver',
  openGraph: {
    title: 'Contact Merritt Wellness | Book Your Wellness Experience in Denver',
    description: 'Get in touch with Merritt Wellness in Sloans Lake, Denver. Book yoga, sound baths, meditation, and wellness events. Call (720) 357-9499.',
    url: 'https://merrittwellness.net/contact',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://merrittwellness.net/images/hero/outside3.jpg',
        width: 1200,
        height: 630,
        alt: 'Merritt Wellness - Historic wellness venue in Denver Sloans Lake',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Merritt Wellness | Denver Yoga & Wellness Studio',
    description: 'Book your wellness experience in Denver\'s Sloans Lake. Yoga, sound baths, meditation & more.',
    images: ['https://merrittwellness.net/images/hero/outside3.jpg'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/contact',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
