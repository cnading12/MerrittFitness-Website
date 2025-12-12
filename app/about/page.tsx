'use client';

import Image from "next/image";

export default function AboutPage() {
  return (
    <>
      <main className="bg-[#faf8f5] font-sans">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 bg-gradient-to-b from-[#735e59] via-[#735e59]/95 to-[#faf8f5] overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-[#f2eee9]/40 rounded-full animate-float blur-sm"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-[#f2eee9]/30 rounded-full animate-float-delay blur-sm"></div>
          <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-[#f2eee9]/35 rounded-full animate-float-slow blur-sm"></div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 animate-fade-in-up">
                <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/10 backdrop-blur-sm text-[#f2eee9]/90 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Our Story • Est. 1905
                </span>
                <h1 className="text-5xl lg:text-7xl font-light mb-6 text-[#f2eee9] leading-tight font-serif">
                  <span className="block font-thin drop-shadow-lg">Where History</span>
                  <span className="block font-bold drop-shadow-lg text-[#f2eee9]">Meets Healing</span>
                </h1>
                <div className="w-24 h-px bg-gradient-to-r from-[#f2eee9]/80 via-[#f2eee9]/40 to-transparent mb-8"></div>
                <p className="text-xl text-[#f2eee9]/90 leading-relaxed mb-8 drop-shadow-md">
                  In the heart of Denver's Sloans Lake neighborhood stands a sacred space where community has gathered for over a century. Today, this beautifully restored 1905 landmark opens its doors as Merritt Wellness—a sanctuary for modern wellness.
                </p>
                <div className="flex items-center gap-4 text-[#f2eee9]/70 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                    </svg>
                    <span>Est. 1905</span>
                  </div>
                  <div className="w-1 h-1 bg-[#f2eee9]/50 rounded-full"></div>
                  <span>Historic Landmark</span>
                  <div className="w-1 h-1 bg-[#f2eee9]/50 rounded-full"></div>
                  <span>Sloans Lake</span>
                </div>
              </div>

              <div className="order-1 lg:order-2 animate-fade-in-up-delay">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#f2eee9]/20 to-[#a08b84]/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Image
                    src="/images/hero/outside5.webp"
                    alt="Historic Merritt Wellness building exterior showing 1905 church architecture"
                    width={600}
                    height={400}
                    className="relative rounded-3xl shadow-2xl group-hover:scale-[1.02] transition-transform duration-500"
                    priority
                  />
                  <div className="absolute -bottom-6 -right-6 bg-[#faf8f5] rounded-2xl p-6 shadow-xl border border-[#735e59]/10">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#735e59] font-serif">119</div>
                      <div className="text-sm text-[#6b5f5b] uppercase tracking-wide">Years of Community</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-24 bg-gradient-to-b from-[#faf8f5] via-[#f2eee9]/50 to-[#faf8f5]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Our Journey
              </span>
              <h2 className="text-4xl md:text-5xl font-light leading-tight text-[#4a3f3c] mb-6 font-serif">
                Our
                <span className="block font-bold text-[#735e59]">Story</span>
              </h2>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#735e59] to-transparent mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#735e59]/20 to-[#735e59]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">Then</h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  Built as Merritt Methodist Church, this space welcomed generations of neighbors seeking connection, celebration, and spiritual growth.
                </p>
              </div>

              <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#a08b84]/30 to-[#a08b84]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">Transformation</h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  Through thoughtful restoration, we've preserved the building's soul while creating a modern space for wellness and creativity.
                </p>
              </div>

              <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-[#735e59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">Now</h3>
                <p className="text-[#6b5f5b] leading-relaxed">
                  Today, we continue the legacy of community gathering, offering space for yoga, meditation, events, and personal transformation.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-10 shadow-xl border border-[#735e59]/10">
              <p className="text-lg text-[#6b5f5b] leading-relaxed mb-6">
                Step inside and feel the energy that flows through these walls—soaring ceilings that seem to lift your spirit, original architecture that tells stories of decades past, and abundant natural light that bathes every corner in warmth. This isn't just a Wellness studio; it's a sanctuary where history and healing converge.
              </p>
              <p className="text-lg text-[#6b5f5b] leading-relaxed">
                We've honored every beam, preserved every detail that made this space special, while creating something entirely new. Here, surrounded by the echoes of community gatherings past, you'll find your own path to wellness, creativity, and connection.
              </p>
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section className="py-24 bg-[#faf8f5]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-flex items-center px-4 py-2 bg-[#735e59]/10 text-[#735e59] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                What We Offer
              </span>
              <h2 className="text-4xl md:text-5xl font-light leading-tight text-[#4a3f3c] mb-6 font-serif">
                The Merritt
                <span className="block font-bold text-[#735e59]">Experience</span>
              </h2>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#735e59] to-transparent mx-auto mb-8"></div>
              <p className="text-xl text-[#6b5f5b] max-w-3xl mx-auto leading-relaxed">
                Whether you're seeking personal practice, community connection, or the perfect venue for your event, our doors are open to welcome you home.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="group bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-[#735e59]/20 to-[#735e59]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🧘</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">For Practitioners</h3>
                <p className="text-[#6b5f5b] leading-relaxed mb-6">
                  Find your flow in our light-filled sanctuary. From gentle yoga to dynamic movement, sound baths to silent meditation, every practice is elevated by the sacred energy of this historic space.
                </p>
                <ul className="text-[#6b5f5b] space-y-3">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Premium yoga and meditation classes
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Workshops and wellness events
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Community gatherings
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Private sessions available
                  </li>
                </ul>
              </div>

              <div className="group bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-[#735e59]/10 hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-[#a08b84]/30 to-[#a08b84]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🏛️</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#4a3f3c] group-hover:text-[#735e59] transition-colors duration-300 font-serif">For Event Hosts</h3>
                <p className="text-[#6b5f5b] leading-relaxed mb-6">
                  Create unforgettable experiences in our inspiring venue. With its stunning architecture and peaceful ambiance, Merritt Wellness provides the perfect backdrop for workshops, retreats, and special events.
                </p>
                <ul className="text-[#6b5f5b] space-y-3">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Intimate workshop space
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Historic architectural details
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Natural light and acoustics
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#735e59] rounded-full mr-3"></div>
                    Flexible event hosting
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Heritage Note */}
        <section className="relative py-24 bg-[#735e59] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero/1.jpg"
              alt="Merritt Wellness interior"
              fill
              className="object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#735e59]/95 via-[#735e59]/90 to-[#735e59]/95"></div>
          </div>

          {/* Floating elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-[#f2eee9]/20 rounded-full animate-float blur-sm"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-[#f2eee9]/15 rounded-full animate-float-delay blur-sm"></div>
          <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-[#f2eee9]/20 rounded-full animate-float-slow blur-sm"></div>

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/10 backdrop-blur-sm text-[#f2eee9]/90 text-sm font-semibold rounded-full tracking-wide uppercase mb-8">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Our Heritage
            </span>
            <h2 className="text-4xl md:text-5xl font-light text-[#f2eee9] mb-8 font-serif">
              Step Into
              <span className="block font-bold">Living History</span>
            </h2>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#f2eee9]/60 to-transparent mx-auto mb-8"></div>
            <p className="text-xl leading-relaxed text-[#f2eee9]/80 max-w-3xl mx-auto">
              Every visit to Merritt Wellness is a step into living history. As you practice in our sanctuary, you join a continuum of community, growth, and connection that spans more than a century. This building has witnessed countless moments of joy, reflection, and transformation—and now it's ready to witness yours.
            </p>
          </div>
        </section>
      </main>

      {/* Custom CSS for animations */}
      <style jsx>{`
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
      `}</style>
    </>
  );
}
