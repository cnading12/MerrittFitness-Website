import "./globals.css";
import { Metadata } from 'next'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals-ios.css";

export const metadata: Metadata = {
  title: 'Merritt Wellness | Yoga, Sound Baths & Meditation in Sloans Lake Denver CO',
  description: 'Experience yoga classes, sound bath healing, meditation sessions, and wellness events at Merritt Wellness - a stunning 1905 historic venue in Denver\'s Sloans Lake. 2,400 sq ft sanctuary with 24-foot ceilings. Book today!',
  keywords: 'yoga Denver, sound bath Denver, meditation Denver, yoga Sloans Lake, sound healing Denver, wellness studio Denver, yoga class near me Denver, sound bath near me, meditation class Denver, holistic healing Denver, yoga retreat Denver, mindfulness Denver, breathwork Denver, wellness events Denver, yoga studio rental Denver, private yoga Denver, group meditation Denver, healing arts Denver, spiritual wellness Denver, yoga Highland Denver, yoga Berkeley Denver, wellness center Sloans Lake, sound therapy Denver, guided meditation Denver, restorative yoga Denver, vinyasa yoga Denver, yoga workshop Denver, wellness workshop Denver, historic yoga studio Denver',
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
    title: 'Merritt Wellness | Yoga, Sound Baths & Meditation in Denver',
    description: 'Experience yoga classes, sound bath healing, and meditation at our stunning 1905 historic venue in Sloans Lake Denver. 24-foot ceilings, perfect acoustics. Book today!',
    url: 'https://merrittwellness.net',
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
    title: 'Merritt Wellness | Yoga, Sound Baths & Meditation Denver',
    description: 'Experience yoga, sound baths, and meditation at our stunning 1905 venue in Sloans Lake Denver. Book your wellness journey today!',
    images: ['https://merrittwellness.net/images/hero/outside3.jpg'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net',
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
    'application-name': 'Merritt Wellness',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: '#735e59',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts - Cormorant Garamond (serif) + Jost (sans) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" 
          rel="stylesheet" 
        />
        
        {/* SEO meta tags */}
        <meta name="author" content="Merritt Wellness" />
        <meta name="publisher" content="Merritt Wellness" />
        <meta name="copyright" content="© 2024 Merritt Wellness. All rights reserved." />
        <meta name="language" content="en-US" />
        <meta name="revisit-after" content="7 days" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="referrer" content="origin-when-cross-origin" />
        
        {/* Geographic and local business info */}
        <meta name="geo.region" content="US-CO" />
        <meta name="geo.placename" content="Denver" />
        <meta name="geo.position" content="39.750982;-105.032254" />
        <meta name="ICBM" content="39.750982, -105.032254" />
        
        {/* Business-specific meta tags */}
        <meta name="business:type" content="wellness center" />
        <meta name="business:hours" content="Mo-Su 06:00-22:00" />
        <meta name="business:phone" content="+1-720-357-9499" />
        <meta name="business:email" content="manager@merrittwellness.net" />
        <meta name="business:address" content="2246 Irving St, Denver, CO 80211" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://calendar.google.com" />
        
        {/* DNS prefetch */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google.com" />
        <link rel="dns-prefetch" href="//calendar.google.com" />
        
        {/* Structured data for rich snippets - LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["LocalBusiness", "HealthAndBeautyBusiness", "SportsActivityLocation"],
              "@id": "https://merrittwellness.net",
              "name": "Merritt Wellness",
              "description": "Premier yoga studio and sound bath healing center in Denver's Sloans Lake neighborhood. Historic 1905 venue offering yoga classes, sound healing sessions, meditation, breathwork, and wellness events.",
              "url": "https://merrittwellness.net",
              "telephone": "+1-720-357-9499",
              "email": "manager@merrittwellness.net",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "2246 Irving St",
                "addressLocality": "Denver",
                "addressRegion": "CO",
                "postalCode": "80211",
                "addressCountry": "US",
                "areaServed": ["Sloans Lake", "Highland", "Berkeley", "Regis", "West Colfax", "Jefferson Park"]
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 39.750981971554395,
                "longitude": -105.03225422320789
              },
              "openingHours": ["Mo-Su 06:00-22:00"],
              "priceRange": "$$",
              "currenciesAccepted": "USD",
              "paymentAccepted": ["Cash", "Credit Card", "Venmo", "Zelle"],
              "image": [
                "https://merrittwellness.net/images/hero/outside3.jpg",
                "https://merrittwellness.net/images/hero/1.jpg"
              ],
              "sameAs": [
                "https://www.instagram.com/merritt.fitness",
                "https://www.facebook.com/merritt.fitness"
              ],
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "5.0",
                "reviewCount": "47",
                "bestRating": "5",
                "worstRating": "1"
              },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Wellness Services",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Yoga Classes",
                      "description": "Vinyasa, Hatha, Restorative, and Hot Yoga classes in historic Denver venue"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Sound Bath Healing",
                      "description": "Immersive sound healing sessions with crystal bowls and gongs in acoustically perfect space"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Meditation Sessions",
                      "description": "Guided meditation and mindfulness classes in serene sanctuary setting"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Wellness Event Space Rental",
                      "description": "2,400 sq ft historic venue for workshops, retreats, and wellness gatherings"
                    }
                  }
                ]
              },
              "amenityFeature": [
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Historic Architecture",
                  "value": "Beautifully restored 1905 church building"
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Square Footage",
                  "value": "2,400 sq ft open sanctuary space"
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Ceiling Height",
                  "value": "24 feet - ideal for sound healing"
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Acoustics",
                  "value": "Perfect natural acoustics for sound baths"
                },
                {
                  "@type": "LocationFeatureSpecification",
                  "name": "Natural Light",
                  "value": "Abundant natural light through original windows"
                }
              ]
            })
          }}
        />

        {/* FAQ Schema for featured snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Where can I find sound bath sessions in Denver?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Merritt Wellness offers immersive sound bath healing sessions in our historic 1905 venue in Sloans Lake, Denver. Our 24-foot ceilings and perfect acoustics create an ideal environment for sound healing with crystal bowls and gongs. Book online at merrittwellness.net or call (720) 357-9499."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What yoga classes are available near Sloans Lake Denver?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Merritt Wellness in Sloans Lake offers a variety of yoga classes including Vinyasa, Hatha, Restorative, and Hot Yoga. Our historic 2,400 sq ft space features 24-foot ceilings and abundant natural light, perfect for all levels of practice. Located at 2246 Irving St, Denver CO 80211."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How much does it cost to rent a wellness space in Denver?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Merritt Wellness offers space rental starting at $95/hour for yoga instructors, wellness practitioners, and event hosts. We offer partnership pricing for regular bookings of 2+ hours weekly. Contact us at (720) 357-9499 for custom quotes and availability."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is there a meditation center in the Sloans Lake area of Denver?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! Merritt Wellness is a meditation and wellness center located in the heart of Sloans Lake, Denver. Our beautifully restored 1905 historic building provides a peaceful sanctuary for meditation, mindfulness, breathwork, and holistic healing practices. Visit us at 2246 Irving St, Denver CO 80211."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What makes Merritt Wellness unique for wellness events?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Merritt Wellness is housed in a stunning 1905 historic church featuring 24-foot ceilings, perfect natural acoustics ideal for sound healing, abundant natural light, and 2,400 square feet of open sanctuary space. Our venue in Denver's Sloans Lake neighborhood has been thoughtfully restored to honor its heritage while creating a modern wellness sanctuary."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Do you offer private yoga sessions in Denver?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, Merritt Wellness accommodates private yoga sessions, small group classes, and personal wellness practices. Our flexible scheduling and beautiful historic space make it perfect for intimate sessions. Book online or call (720) 357-9499 to schedule your private session."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="ios-fix text-[#4a3f3c] bg-[#faf8f5] flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}