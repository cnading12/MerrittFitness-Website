import { Metadata } from 'next'
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/site-schema'

// Age is computed, never typed. The old Twitter description hardcoded "119
// years", which was wrong the moment the year turned.
const yearsServing = new Date().getFullYear() - 1905

export const metadata: Metadata = {
  title: "Our Story | Merritt Wellness — a Restored 1905 Sanctuary in Sloans Lake, Denver",
  description: `Built in 1905 as Merritt Methodist Church and restored as a gathering place for Denver, Merritt Wellness has served the Sloans Lake neighborhood for ${yearsServing} years. Today the sanctuary hosts weddings, concerts, art shows, congregations, and weekly yoga, breathwork, sound bath, and dance classes under 24-foot vaulted ceilings.`,
  keywords: 'Merritt Wellness history, Merritt Methodist Church Denver, historic venue Sloans Lake, 1905 landmark Denver, restored church venue Denver, historic event venue Denver, Denver community gathering space',
  openGraph: {
    title: "Our Story | Merritt Wellness — a Restored 1905 Sanctuary in Denver",
    description: `A 1905 landmark that has gathered Denver's Sloans Lake neighborhood for ${yearsServing} years, now a venue for weddings, concerts, classes, and community gatherings.`,
    url: 'https://www.merrittwellness.net/about',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://www.merrittwellness.net/images/hero/outside3.webp',
        width: 1200,
        height: 630,
        alt: 'Historic Merritt Wellness building exterior - restored 1905 building in Denver Sloans Lake',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Our Story | Merritt Wellness — a Restored 1905 Sanctuary in Denver',
    description: `${yearsServing} years of community gathering in Denver's Sloans Lake neighborhood, from Merritt Methodist Church to the venue it is today.`,
    images: ['https://www.merrittwellness.net/images/hero/outside3.webp'],
  },
  alternates: {
    canonical: 'https://www.merrittwellness.net/about',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Rendered from the layout because app/about/page.tsx is a client
  // component; the markup has to be in the initial HTML.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd('/about', [{ name: 'About' }]))}
      />
      {children}
    </>
  )
}
