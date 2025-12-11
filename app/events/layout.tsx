import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upcoming Events | Merritt Wellness - Yoga, Sound Baths & Workshops in Denver',
  description: 'Discover upcoming wellness events at Merritt Wellness in Denver\'s Sloans Lake. Join us for sound baths, yoga workshops, breathwork sessions, meditation circles, and more in our historic 1905 sanctuary.',
  keywords: 'wellness events Denver, sound bath events, yoga workshop Denver, meditation event Denver, breathwork Denver, wellness workshop Sloans Lake, spiritual events Denver, healing events Denver',
  openGraph: {
    title: 'Upcoming Events | Merritt Wellness',
    description: 'Join us for transformative wellness events at our historic 1905 venue in Denver. Sound baths, yoga workshops, breathwork, and more.',
    url: 'https://merrittwellness.net/events',
    siteName: 'Merritt Wellness',
    images: [
      {
        url: 'https://merrittwellness.net/images/hero/1.jpg',
        width: 1200,
        height: 630,
        alt: 'Merritt Wellness Events - Sound Baths and Yoga Workshops in Denver',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upcoming Events | Merritt Wellness Denver',
    description: 'Transformative wellness events at our historic 1905 venue. Sound baths, yoga workshops, breathwork, and more.',
    images: ['https://merrittwellness.net/images/hero/1.jpg'],
  },
  alternates: {
    canonical: 'https://merrittwellness.net/events',
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
