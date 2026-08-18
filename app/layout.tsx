import "./globals.css";
import { Metadata } from 'next'
import { Cormorant_Garamond, Jost } from 'next/font/google'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { siteGraphJsonLd, jsonLdScript } from "@/lib/site-schema";
import "./globals-ios.css";

// Self-hosted through next/font instead of a render-blocking <link> to
// fonts.googleapis.com. Same families and weights as before; next/font
// inlines the @font-face rules, preloads the files from our own origin, and
// removes two third-party round trips from the critical path. The CSS
// variables are consumed by the .font-serif / .font-sans rules in
// globals.css, which keep their original fallback stacks.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.merrittwellness.net'),
  // No `template` here on purpose: every interior route already sets a
  // complete, brand-suffixed title, and a template would double the brand
  // ("... | Merritt Wellness | Merritt Wellness Denver").
  title:
    "Merritt Wellness | Historic Event, Wedding & Class Venue in Sloans Lake, Denver",
  description:
    "A restored 1905 sanctuary in Denver's Sloans Lake: weddings, private events, concerts, art shows, and weekly yoga, breathwork, sound bath, and dance classes. Up to 125 guests under 24-foot vaulted ceilings, with 22 on-site parking spots and published hourly rates from $95.",
  keywords: [
    'event venue Denver',
    "Sloans Lake event space",
    'Denver wedding venue',
    'historic wedding venue Denver',
    'yoga studio rental Denver',
    'dance studio rental Denver',
    'sound bath Denver',
    'breathwork Denver',
    'class space rental Denver',
    'private event venue Denver',
    'concert venue rental Denver',
    'church space for rent Denver',
  ],
  authors: [{ name: 'Merritt Wellness', url: 'https://www.merrittwellness.net' }],
  creator: 'Merritt Wellness',
  publisher: 'Merritt Wellness',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title:
      "Merritt Wellness | Historic Event, Wedding & Class Venue in Sloans Lake, Denver",
    description:
      "A restored 1905 sanctuary for weddings, private events, concerts, and weekly wellness and movement classes. 24-foot vaulted ceilings, 125 guests, published rates.",
    url: 'https://www.merrittwellness.net',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://www.merrittwellness.net/images/hero/1.webp',
        width: 1920,
        height: 1256,
        alt: "The restored 1905 brick sanctuary that houses Merritt Wellness, on its tree-lined corner in Denver's Sloans Lake neighborhood",
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Merritt Wellness | Historic Event & Class Venue in Sloans Lake, Denver",
    description:
      'Weddings, private events, concerts, and weekly yoga, breathwork, sound bath, and dance classes in a restored 1905 sanctuary.',
    images: ['https://www.merrittwellness.net/images/hero/1.webp'],
  },
  alternates: {
    canonical: 'https://www.merrittwellness.net',
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
  category: 'Event Venue',
  other: {
    'application-name': 'Merritt Wellness',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    // NOTE: `format-detection: telephone=no` used to live here. It was
    // suppressing the browser's automatic phone-number detection on a
    // business whose primary conversion is a phone call. Removed on purpose
    // — do not add it back.
    'geo.region': 'US-CO',
    'geo.placename': 'Denver',
    'geo.position': '39.7508;-105.0332',
    ICBM: '39.7508, -105.0332',
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
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <head>
        {/* The single source of truth for the business and website nodes.
            Interior pages add EventVenue / FAQPage / BreadcrumbList / Event
            nodes that reference this one by @id — they never redeclare the
            business itself. See lib/site-schema.ts. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(siteGraphJsonLd())}
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
