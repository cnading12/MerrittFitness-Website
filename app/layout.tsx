import "./globals.css";
import { Metadata } from 'next'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals-ios.css";

export const metadata: Metadata = {
  title: 'Merritt Fitness | Historic Wellness Space in Denver\'s Sloans Lake',
  description: 'Book your yoga, meditation, sound bath, or wellness event at Merritt Fitness - a beautifully restored 1905 historic venue in Denver\'s Sloans Lake neighborhood.',
  keywords: 'yoga studio rental Denver, meditation space Denver, sound bath venue, wellness event space, historic venue Denver, Sloans Lake',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Merritt Fitness | Historic Wellness Space in Denver',
    description: 'A beautifully restored 1905 venue for yoga, meditation, and wellness events in Denver\'s Sloans Lake neighborhood.',
    url: 'https://merrittfitness.com',
    siteName: 'Merritt Fitness',
    images: [
      {
        url: 'https://merrittfitness.com/images/hero/outside3.jpg', // CHANGED: Using exterior shot
        width: 1200,
        height: 630,
        alt: 'Historic Merritt Fitness building exterior - 1905 church in Denver Sloans Lake',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merritt Fitness | Historic Wellness Space in Denver',
    description: 'Book your wellness event at our beautifully restored 1905 venue in Denver.',
    images: ['https://merrittfitness.com/images/hero/outside3.jpg'], // CHANGED: Using exterior shot
  },
  alternates: {
    canonical: 'https://merrittfitness.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'wellness',
  classification: 'business',
  other: {
    'application-name': 'Merritt Fitness',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: '#10b981',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ENHANCED SEO: Additional meta tags for better search performance */}
        <meta name="author" content="Merritt Fitness" />
        <meta name="publisher" content="Merritt Fitness" />
        <meta name="copyright" content="© 2024 Merritt Fitness. All rights reserved." />
        <meta name="language" content="en-US" />
        <meta name="revisit-after" content="7 days" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="referrer" content="origin-when-cross-origin" />
        
        {/* ENHANCED SEO: Geographic and local business info */}
        <meta name="geo.region" content="US-CO" />
        <meta name="geo.placename" content="Denver" />
        <meta name="geo.position" content="39.750982;-105.032254" />
        <meta name="ICBM" content="39.750982, -105.032254" />
        
        {/* ENHANCED SEO: Business-specific meta tags */}
        <meta name="business:type" content="wellness center" />
        <meta name="business:hours" content="Mo-Su 06:00-22:00" />
        <meta name="business:phone" content="+1-720-357-9499" />
        <meta name="business:email" content="manager@merrittfitness.net" />
        <meta name="business:address" content="2246 Irving St, Denver, CO 80211" />
        
        {/* ENHANCED SEO: Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://calendar.google.com" />
        
        {/* ENHANCED SEO: DNS prefetch for faster loading */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google.com" />
        <link rel="dns-prefetch" href="//calendar.google.com" />
        
        {/* ENHANCED SEO: Structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://merrittfitness.com",
              "name": "Merritt Fitness",
              "description": "Historic wellness and event space in Denver's Sloans Lake neighborhood, perfect for yoga, meditation, sound baths, and movement arts.",
              "url": "https://merrittfitness.com",
              "telephone": "+1-720-357-9499",
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
                "latitude": 39.750981971554395,
                "longitude": -105.03225422320789
              },
              "openingHours": ["Mo-Su 06:00-22:00"],
              "priceRange": "$$",
              "image": [
                "https://merrittfitness.com/images/hero/outside3.jpg",
                "https://merrittfitness.com/images/hero/1.jpg"
              ],
              "sameAs": [
                "https://www.instagram.com/merritt.fitness",
                "https://www.facebook.com/merritt.fitness"
              ],
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Wellness Services",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Yoga Class Rental",
                      "description": "Historic space rental for yoga classes and meditation"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Event Space Rental",
                      "description": "Wellness event space for workshops, retreats, and gatherings"
                    }
                  }
                ]
              },
              "amenityFeature": [
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Historic Architecture",
                  "value": "1905 restored church building"
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Square Footage",
                  "value": "2400 sq ft"
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Ceiling Height",
                  "value": "24 feet"
                }
              ]
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