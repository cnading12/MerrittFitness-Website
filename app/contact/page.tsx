'use client';

import Link from "next/link";
import Image from "next/image";

export default function ContactPage() {
  return (
    <>
      <main className="bg-[#faf8f5] font-sans min-h-screen">
        {/* Simple Header */}
        <section className="pt-32 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-light text-[#4a3f3c] leading-tight font-serif mb-4">
              Let's <span className="font-bold text-[#735e59]">Connect</span>
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#735e59] to-transparent mx-auto mb-6"></div>
            <p className="text-xl text-[#6b5f5b] leading-relaxed max-w-2xl mx-auto">
              Step into our sacred space where wellness meets community. Whether you're ready to begin your journey or curious about what we offer, we're here to welcome you home.
            </p>
          </div>
        </section>

        {/* Contact Cards Section */}
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Primary Contact */}
              <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#735e59]/20 to-[#735e59]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-6 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">Reach Out</h3>
                <div className="space-y-4">
                  <a
                    href="tel:720-357-9499"
                    className="flex items-center gap-4 text-[#6b5f5b] hover:text-[#735e59] transition-colors group/link"
                  >
                    <div className="p-3 bg-[#735e59]/10 rounded-xl group-hover/link:bg-[#735e59]/20 transition-colors">
                      <svg className="w-5 h-5 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <span className="font-medium text-lg">(720) 357-9499</span>
                  </a>
                  <a
                    href="mailto:manager@merrittwellness.net"
                    className="flex items-center gap-4 text-[#6b5f5b] hover:text-[#735e59] transition-colors group/link"
                  >
                    <div className="p-3 bg-[#a08b84]/20 rounded-xl group-hover/link:bg-[#a08b84]/30 transition-colors">
                      <svg className="w-5 h-5 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-lg">manager@merrittwellness.net</span>
                  </a>
                </div>
              </div>

              {/* Visit Us */}
              <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#a08b84]/30 to-[#a08b84]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-6 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">Visit Our Sanctuary</h3>
                <div className="flex items-start gap-4 text-[#6b5f5b]">
                  <div className="p-3 bg-amber-100/50 rounded-xl mt-1">
                    <svg className="w-5 h-5 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium leading-relaxed text-lg text-[#4a3f3c]">
                      2246 Irving St<br />
                      Denver, CO 80211
                    </p>
                    <p className="text-sm text-[#a08b84] mt-2">
                      Near Sloans Lake • Historic 1905 Church
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social & Tour Section */}
            <div className="bg-white rounded-3xl p-10 shadow-lg border border-[#735e59]/10">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                {/* Social */}
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold mb-4 text-[#4a3f3c] font-serif">Stay Connected</h3>
                  <div className="flex justify-center md:justify-start gap-4">
                    <Link
                      href="https://www.instagram.com/merrittwellnessdenver"
                      className="group p-4 bg-[#735e59]/10 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-[#735e59] hover:bg-[#735e59] hover:text-[#f2eee9]"
                      target="_blank"
                      rel="noopener"
                      aria-label="Follow us on Instagram"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </Link>
                    <Link
                      href="https://www.facebook.com/merrittwellnessdenver"
                      className="group p-4 bg-[#735e59]/10 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-[#735e59] hover:bg-[#735e59] hover:text-[#f2eee9]"
                      target="_blank"
                      rel="noopener"
                      aria-label="Follow us on Facebook"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Tours */}
                <div className="text-center md:text-left md:border-l md:border-[#735e59]/10 md:pl-10">
                  <div className="inline-flex items-center gap-2 text-[#735e59] mb-3">
                    <div className="p-2 bg-amber-100/50 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-lg">Private Tours Available</span>
                  </div>
                  <p className="text-[#6b5f5b] leading-relaxed">
                    Experience the energy of our historic space before your first class. Call or email to schedule your personal walkthrough.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-[#6b5f5b] mb-6">
              Ready to begin your wellness journey?
            </p>
            <Link
              href="/booking"
              className="group inline-flex items-center gap-3 bg-[#735e59] text-[#f2eee9] font-bold px-10 py-5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#5a4a46]"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Your Class
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <p className="text-sm text-[#a08b84] mt-4">
              New to our space? Your first class is just the beginning.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
