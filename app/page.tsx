// app/page.tsx - ENHANCED SEO VERSION (Structure Unchanged)
'use client';

import EnhancedGallery from "@/components/EnhancedGallery";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [calendarLoaded, setCalendarLoaded] = useState(false);

  // ENHANCED: More powerful local SEO structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["ExerciseGym", "LocalBusiness", "EventVenue"],
    "name": "Merritt Fitness",
    "description": "Historic yoga studio and wellness sanctuary in Denver's Sloan's Lake neighborhood. Professional event venue for yoga classes, meditation, sound healing, workshops, and private events.",
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
      "latitude": "39.750981971554395",
      "longitude": "-105.03225422320789"
    },
    "openingHours": [
      "Mo-Su 06:00-22:00"
    ],
    "priceRange": "$95/hour",
    "paymentAccepted": ["Credit Card", "Cash", "Check", "Venmo", "Zelle"],
    "image": [
      "https://merrittfitness.com/images/hero/outside3.jpg",
      "https://merrittfitness.com/images/hero/1.jpg",
      "https://merrittfitness.com/images/events/2.JPEG"
    ],
    "sameAs": [
      "https://www.instagram.com/merritt.fitness",
      "https://www.facebook.com/merritt.fitness"
    ],
    "amenityFeature": [
      {
        "@type": "LocationFeatureSpecification",
        "name": "Historic Building",
        "value": true
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "24-foot Ceilings",
        "value": true
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "Natural Light",
        "value": true
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "Perfect Acoustics",
        "value": true
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "Parking Available",
        "value": true
      }
    ],
    "hasMap": "https://maps.google.com/?q=2246+Irving+St,+Denver,+CO+80211",
    "areaServed": [
      {
        "@type": "City",
        "name": "Denver"
      },
      {
        "@type": "Neighborhood",
        "name": "Sloan's Lake",
        "containedInPlace": "Denver, CO"
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
      }
    ],
    "makesOffer": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Yoga Classes",
          "description": "Professional yoga instruction in historic Denver venue"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Event Venue Rental",
          "description": "Historic 2,400 sq ft space for workshops, retreats, and private events"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Sound Healing",
          "description": "Sound bath sessions with perfect church acoustics"
        }
      }
    ],
    "review": {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "author": {
        "@type": "Person",
        "name": "Denver Wellness Community"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": "47"
    }
  };

  return (
    <>
      {/* ENHANCED: Structured Data for Local SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="bg-white font-sans">
        {/* HERO - Enhanced alt text only */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
          <Image
            src="/images/hero/outside3.jpg"
            alt="Historic Merritt Fitness yoga studio exterior in Denver Sloan's Lake neighborhood - 1905 church building"
            fill
            className="object-cover brightness-75 scale-105 animate-slow-zoom"
            priority
            quality={95}
          />

          {/* Enhanced floating elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-white/40 rounded-full animate-float blur-sm"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-white/30 rounded-full animate-float-delay blur-sm"></div>
          <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-white/35 rounded-full animate-float-slow blur-sm"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/25 rounded-full animate-float blur-sm"></div>

          <div className="relative z-20 text-center text-white px-6 max-w-5xl mx-auto">
            <div className="mb-8 animate-fade-in-up">
              <h1 className="text-6xl md:text-8xl font-light tracking-tight mb-6 leading-none">
                <span className="block font-thin drop-shadow-lg">Merritt</span>
                <span className="block font-bold bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent drop-shadow-lg">Fitness</span>
              </h1>
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent mx-auto mb-8"></div>
              {/* ENHANCED: Better local keywords in hero description */}
              <p className="text-xl md:text-2xl font-light leading-relaxed max-w-3xl mx-auto opacity-95 drop-shadow-md">
                Denver's premier historic wellness sanctuary in Sloan's Lake - where 1905 sacred architecture meets modern yoga, meditation, and mindful movement
              </p>
            </div>

            {/* Enhanced CTA Section */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up-delay">
              <Link
                href="#booking"
                className="group relative bg-white text-black font-semibold px-12 py-5 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 overflow-hidden backdrop-blur-sm"
              >
                <span className="relative z-10 flex items-center">
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                  Reserve Your Experience
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>
              <Link
                href="/about"
                className="group border-2 border-white/70 text-white font-semibold px-12 py-5 rounded-full backdrop-blur-sm hover:bg-white hover:text-black transition-all duration-500 hover:border-white"
              >
                <span className="flex items-center">
                  Discover the Space
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          {/* Enhanced scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/70 rounded-full flex justify-center backdrop-blur-sm">
              <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION - Enhanced headings and descriptions only */}
       <section id="about" className="relative py-24 bg-gradient-to-b from-white via-gray-50/50 to-white">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid lg:grid-cols-2 gap-16 items-center">
      {/* Left Content - Enhanced with local keywords */}
      <div className="space-y-8">
        <div>
          <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Since 1905•Denver Historic Landmark
          </span>
          <h2 className="text-4xl md:text-5xl font-light leading-tight text-gray-900 mb-6">
            Denver's Sacred Space
            <span className="block font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">for Wellness & Community</span>
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent mb-8"></div>
          <div className="space-y-6">
            {/* ENHANCED: Better local SEO content */}
            <p className="text-lg text-gray-600 leading-relaxed">
              Located in Denver's beloved Sloan's Lake neighborhood, Merritt Fitness occupies a lovingly restored 1905 Methodist church that has served our community for over a century. This historic landmark offers Denver yogis, meditation practitioners, and wellness professionals a truly unique sanctuary.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Our 2,400 square foot space features original stained glass, soaring 24-foot ceilings, and perfect acoustics that make every yoga class, sound bath, and meditation session an extraordinary experience. From Highland to Berkeley, Regis to Sloan's Lake, Denver wellness seekers find their home here.
            </p>
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
          <div className="text-center group">
            <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors duration-300">119</div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Years Serving Denver</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors duration-300">24ft</div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Cathedral Ceilings</div>
          </div>
          <div className="text-center group">
            <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors duration-300">2,400</div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Square Feet</div>
          </div>
        </div>

        {/* Call-to-Action */}
        <div className="pt-8">
          <Link
            href="/about"
            className="inline-flex items-center bg-gray-900 text-white font-semibold px-8 py-4 rounded-xl hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 group shadow-lg hover:shadow-xl"
          >
            <span>Learn Our Story</span>
            <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Right Features Grid - Enhanced with local keywords */}
      <div className="grid grid-cols-2 gap-6 auto-rows-fr">
        <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 hover:-translate-y-2 flex flex-col">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <span className="text-3xl filter group-hover:brightness-110">🏛️</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-amber-700 transition-colors duration-300 flex-shrink-0">Historic Denver Landmark</h3>
          <p className="text-gray-600 text-sm leading-relaxed flex-1">
            Original 1905 Methodist church architecture with preserved stained glass, soaring ceilings, and timeless elegance in the heart of Sloan's Lake
          </p>
        </div>

        <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 hover:-translate-y-2 flex flex-col">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <span className="text-3xl filter group-hover:brightness-110">☀️</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-700 transition-colors duration-300 flex-shrink-0">Natural Light Studio</h3>
          <p className="text-gray-600 text-sm leading-relaxed flex-1">
            Floor-to-ceiling windows bathe Denver's most beautiful yoga space in natural light throughout the day
          </p>
        </div>

        <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 hover:-translate-y-2 flex flex-col">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <span className="text-3xl filter group-hover:brightness-110">🤝</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300 flex-shrink-0">Inclusive Wellness Haven</h3>
          <p className="text-gray-600 text-sm leading-relaxed flex-1">
            A non-denominational sanctuary welcoming all Denver wellness practitioners, paths, and people
          </p>
        </div>

        <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 hover:-translate-y-2 flex flex-col">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <span className="text-3xl filter group-hover:brightness-110">🎵</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors duration-300 flex-shrink-0">Perfect Sound Healing Acoustics</h3>
          <p className="text-gray-600 text-sm leading-relaxed flex-1">
            Original church acoustics create Denver's most immersive sound bath and meditation experience
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<EnhancedGallery />

        {/* FEATURES SECTION - Enhanced with local keywords */}
        <section className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Denver's Premier Wellness Venue
              </span>
              <h2 className="text-4xl md:text-5xl font-light leading-tight text-gray-900 mb-6">
                Perfect for Every
                <span className="block font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">Denver Wellness Practice</span>
              </h2>
              <div className="w-24 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent mx-auto"></div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
              <div className="relative group">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/images/events/2.JPEG"
                    alt="Dynamic yoga and movement arts classes in Denver's most spacious historic wellness venue"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="text-3xl font-bold text-gray-900">2,400</div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Square Feet</div>
                </div>
              </div>

              <div className="space-y-12">
                {[
                  { emoji: "🧘", title: "Yoga Classes & Meditation", desc: "From intimate 8-person meditation circles to 60-person vinyasa flows, our historic space serves Denver's yoga community with unmatched grace and reverence." },
                  { emoji: "🔔", title: "Sound Baths & Healing", desc: "Our original 1905 church acoustics create Colorado's most powerful resonance for crystal bowls, gongs, and voice work that touches the soul." },
                  { emoji: "🎨", title: "Creative Workshops", desc: "Art therapy, writing circles, and mindful creativity sessions thrive in our light-filled Sloan's Lake sanctuary of inspiration." },
                  { emoji: "🥋", title: "Martial Arts Studio", desc: "24-foot ceilings and professional sprung floors support judo, BJJ, wrestling, and martial arts training in Denver's most unique venue." }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-6 group">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl filter group-hover:brightness-110">{item.emoji}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors duration-300">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-lg">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BOOKING SECTION - Enhanced with local keywords */}
        <section id="booking" className="py-24 bg-gray-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero/1.jpg"
              alt="Merritt Fitness Denver yoga studio interior booking background"
              fill
              className="object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95"></div>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <div className="mb-16">
              <span className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-gray-300 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                Book Your Denver Wellness Experience
              </span>
              <h2 className="text-4xl md:text-6xl font-light text-white mb-8">
                Reserve Your
                <span className="block font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Sloan's Lake Sanctuary</span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
                Join Denver's vibrant wellness community or create your own transformative experience in Colorado's most inspiring historic yoga and meditation space
              </p>
            </div>

            {/* Enhanced Calendar Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 mb-12">
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Denver Wellness Events Calendar</h3>
                  <p className="text-gray-600">Discover upcoming yoga classes, sound baths, and workshops at our Sloan's Lake sanctuary</p>
                </div>

                {/* Calendar with improved loading */}
                <div className="relative h-96 bg-gray-50">
                  {!calendarLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      <div className="text-gray-400 text-center">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-emerald-500 rounded-full animate-spin mb-4 mx-auto"></div>
                        <p className="text-lg font-medium">Loading Denver wellness schedule...</p>
                      </div>
                    </div>
                  )}

                  <iframe
                    src="https://calendar.google.com/calendar/embed?src=c_3b551f029c24c4bae5c74fd94ba5f8bbfae09ddf059090837f29c284fca7bf9f%40group.calendar.google.com&ctz=America%2FDenver"
                    className="w-full h-full border-0"
                    title="Merritt Fitness Denver Events Calendar - Yoga, Meditation, Sound Healing"
                    onLoad={() => setCalendarLoaded(true)}
                    style={{ display: calendarLoaded ? 'block' : 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <Link
                href="/booking"
                className="group relative bg-gradient-to-r from-white to-gray-100 text-black font-bold px-16 py-6 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10 flex items-center text-lg">
                  <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                  Reserve Your Denver Space
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>

              <Link
                href="/contact"
                className="group border-2 border-white/70 text-white font-bold px-16 py-6 rounded-full backdrop-blur-sm hover:bg-white hover:text-black transition-all duration-500 hover:border-white text-lg"
              >
                <span className="flex items-center">
                  <svg className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Let's Create Magic Together
                </span>
              </Link>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: "500+", label: "Denver Events Hosted" },
                { number: "5★", label: "Google Rating" },
                { number: "24/7", label: "Booking Support" },
                { number: "119", label: "Years in Denver" }
              ].map((item, index) => (
                <div key={index} className="group">
                  <div className="text-3xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors duration-300">{item.number}</div>
                  <div className="text-gray-400 text-sm uppercase tracking-wide">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT SECTION - Enhanced with local keywords */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content - Enhanced with local keywords */}
              <div>
                <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Visit Denver's Premier Wellness Sanctuary
                </span>
                <h2 className="text-4xl md:text-5xl font-light leading-tight text-gray-900 mb-8">
                  Find Your Way to
                  <span className="block font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">Merritt Fitness Denver</span>
                </h2>

                <div className="space-y-8 mb-12">
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors duration-300">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors duration-300">Our Denver Location</h3>
                      <p className="text-gray-600 text-lg leading-relaxed">
                        2246 Irving Street<br />
                        Denver, Colorado 80211<br />
                        <span className="text-sm text-gray-500">Heart of Sloan's Lake Neighborhood</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors duration-300">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors duration-300">Denver Studio Hours</h3>
                      <p className="text-gray-600 text-lg leading-relaxed">
                        Available for bookings<br />
                        Monday - Sunday<br />
                        <span className="text-sm text-gray-500">6:00 AM - 10:00 PM Mountain Time</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors duration-300">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors duration-300">Connect with Us</h3>
                      <p className="text-gray-600 text-lg leading-relaxed">
                        Ready to answer your call<br />
                        <span className="text-sm text-gray-500">(720) 357-9499 • manager@merrittfitness.net</span>
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/contact"
                  className="inline-flex items-center bg-black text-white font-semibold px-10 py-4 rounded-full shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  <svg className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Start the Conversation
                </Link>
              </div>

              {/* Right Map */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.495501733334!2d-105.03225422320789!3d39.750981971554395!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c78a04d1b6fa1%3A0x8c9ae4d693f97e2c!2s2246%20Irving%20St%2C%20Denver%2C%20CO%2080211!5e0!3m2!1sen!2sus!4v1754517213228!5m2!1sen!2sus"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Find Merritt Fitness - Historic yoga and wellness studio in Denver's Sloan's Lake neighborhood"
                    className="grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>

                {/* Enhanced Location Badge */}
                <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Merritt Fitness Denver</div>
                      <div className="text-sm text-gray-600">Historic Wellness Sanctuary</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enhanced Custom CSS - Same as before */}
      <style jsx>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up-delay {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slow-zoom {
          animation: slow-zoom 20s ease-in-out infinite alternate;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delay {
          animation: float-delay 8s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out 0.3s both;
        }
        
        .animate-fade-in-up-delay {
          animation: fade-in-up-delay 1s ease-out 0.6s both;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }

        /* Improved hover effects */
        .group:hover .group-hover\\:brightness-110 {
          filter: brightness(1.1);
        }
        
        /* Better transitions for mobile */
        @media (max-width: 768px) {
          .hover\\:-translate-y-2:hover {
            transform: translateY(-4px);
          }
          
          .hover\\:scale-105:hover {
            transform: scale(1.02);
          }
        }
      `}</style>
    </>
  );
}