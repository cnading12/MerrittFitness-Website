import "./globals.css";
import { Metadata } from 'next'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals-ios.css";

export const metadata: Metadata = {
  title: 'Merritt Fitness | Historic Wellness Space in Denver\'s Sloans Lake',
  description: 'Book your yoga, meditation, sound bath, or wellness event at Merritt Fitness - a beautifully restored 1905 historic venue in Denver\'s Sloans Lake neighborhood.',
  keywords: 'yoga studio rental Denver, meditation space Denver, sound bath venue, wellness event space, historic venue Denver, Sloans Lake',
  // UPDATED: Custom favicon configuration
  icons: {
    icon: [
      { url: '/images/hero/logo.png', type: 'image/png' },
      { url: '/favicon.ico' }, // fallback
    ],
    apple: [
      { url: '/images/hero/logo.png', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Merritt Fitness | Historic Wellness Space',
    description: 'A beautifully restored 1905 venue for yoga, meditation, and wellness events in Denver\'s Sloans Lake neighborhood.',
    url: 'https://merrittfitness.com',
    siteName: 'Merritt Fitness',
    images: [
      {
        url: '/images/hero/1.jpg',
        width: 1200,
        height: 630,
        alt: 'Merritt Fitness historic wellness space interior',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merritt Fitness | Historic Wellness Space',
    description: 'Book your wellness event at our beautifully restored 1905 venue in Denver.',
    images: ['/images/hero/1.jpg'],
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
      <body className="ios-fix font-helvetica text-black bg-white flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}