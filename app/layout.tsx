// app/layout.tsx - UPDATED WITH CRITICAL SEO
import "./globals.css";
import { Metadata } from 'next'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals-ios.css";

export const metadata: Metadata = {
  // FIXED: Much more powerful local SEO title
  title: 'Merritt Fitness - Historic Yoga & Wellness Studio in Denver\'s Sloan\'s Lake | Meditation, Sound Healing & Event Venue',
  
  // FIXED: Local SEO optimized description
  description: 'Book yoga classes, meditation, sound healing & wellness events at Merritt Fitness - a beautifully restored 1905 church in Denver\'s Sloan\'s Lake neighborhood. Historic venue rentals available.',
  
  // ADDED: Critical local SEO keywords
  keywords: 'Denver yoga studio, Sloan\'s Lake fitness, Denver meditation center, historic venue rental Denver, Highland neighborhood yoga, sound healing Denver, wellness events Colorado, 1905 church yoga, Berkeley Denver fitness, yoga classes near me',
  
  // Enhanced Open Graph for local SEO
  openGraph: {
    title: 'Merritt Fitness - Denver\'s Historic Yoga & Wellness Sanctuary in Sloan\'s Lake',
    description: 'Experience yoga, meditation & sound healing in our beautifully restored 1905 church. Serving Denver\'s Highland, Berkeley, and Regis neighborhoods.',
    url: 'https://merrittfitness.com',
    siteName: 'Merritt Fitness Denver',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/hero/1.jpg',
        width: 1200,
        height: 630,
        alt: 'Historic Merritt Fitness yoga studio interior in Denver Sloan\'s Lake neighborhood',
      },
    ],
  },
  
  // Enhanced Twitter cards with local focus  
  twitter: {
    card: 'summary_large_image',
    title: 'Merritt Fitness - Historic Denver Yoga Studio in Sloan\'s Lake',
    description: 'Book your wellness experience in our restored 1905 church sanctuary. Denver\'s most unique yoga and meditation space.',
    images: ['/images/hero/1.jpg'],
  },
  
  // CRITICAL: Geographic targeting
  other: {
    'geo.region': 'US-CO',
    'geo.placename': 'Denver',
    'geo.position': '39.7494,-105.0178',
    'ICBM': '39.7494,-105.0178',
  },

  icons: {
    icon: [
      { url: '/images/hero/logo.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/images/hero/logo.png', type: 'image/png' },
    ],
  },
  
  alternates: {
    canonical: 'https://merrittfitness.com',
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* CRITICAL: Local Business Schema Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["ExerciseGym", "LocalBusiness", "EventVenue"],
              "name": "Merritt Fitness",
              "description": "Historic wellness sanctuary offering yoga, meditation, sound healing, and event venue rentals in Denver's Sloan's Lake neighborhood",
              "url": "https://merrittfitness.com",
              "telephone": "+17203579499",
              "email": "manager@merrittfitness.net",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "2246 Irving St",
                "addressLocality": "Denver",
                "addressRegion": "CO",
                "postalCode": "80211",
                "addressCountry": "US"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": "39.7494",
                "longitude": "-105.0178"
              },
              "openingHours": [
                "Mo-Su 06:00-21:00"
              ],
              "priceRange": "$$$",
              "paymentAccepted": ["Credit Card", "Cash", "Check", "Venmo", "Zelle"],
              "image": [
                "https://merrittfitness.com/images/hero/1.jpg",
                "https://merrittfitness.com/images/hero/outside3.jpg", 
                "https://merrittfitness.com/images/hero/mat1.jpg",
                "https://merrittfitness.com/images/hero/mat2.jpg",
                "https://merrittfitness.com/images/hero/nomats.jpg"
              ],
              "sameAs": [
                "https://www.instagram.com/merritt.fitness",
                "https://www.facebook.com/merritt.fitness"
              ],
              "amenityFeature": [
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Parking Available",
                  "value": true
                },
                {
                  "@type": "LocationFeatureSpecification", 
                  "name": "Wheelchair Accessible",
                  "value": true
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Historic Building",
                  "value": true
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Natural Light",
                  "value": true
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Sound System",
                  "value": true
                }
              ],
              "hasMap": "https://maps.google.com/?q=2246+Irving+St,+Denver,+CO+80211",
              "containsPlace": {
                "@type": "EventVenue",
                "name": "Historic Merritt Sanctuary",
                "description": "2,400 sq ft event space with 24-foot ceilings"
              },
              "makesOffer": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Yoga Classes",
                    "description": "Vinyasa, restorative, and specialty yoga classes"
                  }
                },
                {
                  "@type": "Offer", 
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Meditation Sessions",
                    "description": "Guided meditation and mindfulness classes"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service", 
                    "name": "Sound Healing",
                    "description": "Sound bath and healing sessions"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Event Venue Rental",
                    "description": "Historic space rental for workshops, retreats, and private events"
                  }
                }
              ],
              "areaServed": [
                {
                  "@type": "City",
                  "name": "Denver",
                  "sameAs": "https://en.wikipedia.org/wiki/Denver"
                },
                {
                  "@type": "Neighborhood", 
                  "name": "Highland",
                  "containedInPlace": "Denver, CO"
                },
                {
                  "@type": "Neighborhood",
                  "name": "Berkeley", 
                  "containedInPlace": "Denver, CO"
                },
                {
                  "@type": "Neighborhood",
                  "name": "Regis",
                  "containedInPlace": "Denver, CO"
                },
                {
                  "@type": "Neighborhood",
                  "name": "Sloan's Lake",
                  "containedInPlace": "Denver, CO"
                }
              ]
            })
          }}
        />
        
        {/* Website Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Merritt Fitness",
              "url": "https://merrittfitness.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://merrittfitness.com/booking?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="ios-fix font-helvetica text-black bg-white flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}