import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Merritt Wellness - Historic 1905 Wellness Venue in Sloans Lake Denver',
  description: 'Discover the story of Merritt Wellness - a beautifully restored 1905 church transformed into Denver\'s premier wellness sanctuary. Located in Sloans Lake, offering yoga, sound baths, meditation, and holistic healing in a historic space with 24-foot ceilings.',
  keywords: 'Merritt Wellness history, historic yoga studio Denver, 1905 church wellness center, Sloans Lake wellness venue, Denver meditation space history, historic event venue Denver, yoga retreat Denver, wellness sanctuary Colorado',
  openGraph: {
    title: 'About Merritt Wellness | Historic 1905 Wellness Space in Denver',
    description: 'Discover the story of Merritt Wellness - a beautifully restored 1905 church transformed into Denver\'s premier wellness sanctuary in Sloans Lake.',
    url: 'https://merrittwellness.net/about',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://merrittwellness.net/images/hero/outside3.jpg',
        width: 1200,
        height: 630,
        alt: 'Historic Merritt Wellness building exterior - 1905 church in Denver Sloans Lake',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Merritt Wellness | Historic Wellness Space Since 1905',
    description: 'Discover our 119-year history of community gathering in Denver\'s Sloans Lake neighborhood.',
    images: ['https://merrittwellness.net/images/hero/outside3.jpg'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/about',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
