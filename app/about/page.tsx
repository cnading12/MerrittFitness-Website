import Image from "next/image";
import { Calendar, Heart, Users, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="pt-36 pb-20">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-5xl lg:text-6xl font-light mb-6 text-gray-900 leading-tight">
              Where History
              <br />
              <span className="italic text-emerald-700">Meets Healing</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              In the heart of Denver's Sloan's Lake neighborhood stands a sacred space where community has gathered for over a century. Today, this beautifully restored 1905 landmark opens its doors as Merritt Fitness—a sanctuary for modern wellness.
            </p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>Est. 1905</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <span>Historic Landmark</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <span>Sloan's Lake</span>
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
            <div className="relative">
              <Image
                src="/images/hero/outside2.jpg"
                alt="Historic Merritt Fitness building exterior showing 1905 church architecture"
                width={600}
                height={400}
                className="rounded-2xl shadow-2xl"
                priority
              />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl p-4 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-700">119</div>
                  <div className="text-xs text-gray-500">Years of Community</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="bg-gradient-to-br from-gray-50 to-emerald-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light mb-6 text-gray-900">Our Sacred Story</h2>
            <div className="w-16 h-0.5 bg-emerald-600 mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Heart size={24} className="text-emerald-700" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Then</h3>
              <p className="text-gray-600 leading-relaxed">
                Built as Merritt Methodist Church, this space welcomed generations of neighbors seeking connection, celebration, and spiritual growth.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-4">
                <Sparkles size={24} className="text-rose-700" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Transformation</h3>
              <p className="text-gray-600 leading-relaxed">
                Through thoughtful restoration, we've preserved the building's soul while creating a modern sanctuary for wellness and creativity.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Users size={24} className="text-blue-700" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Now</h3>
              <p className="text-gray-600 leading-relaxed">
                Today, we continue the legacy of community gathering, offering space for yoga, meditation, events, and personal transformation.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Step inside and feel the energy that flows through these walls—soaring ceilings that seem to lift your spirit, original architecture that tells stories of decades past, and abundant natural light that bathes every corner in warmth. This isn't just a fitness studio; it's a sanctuary where history and healing converge.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              We've honored every beam, preserved every detail that made this space special, while creating something entirely new. Here, surrounded by the echoes of community gatherings past, you'll find your own path to wellness, creativity, and connection.
            </p>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light mb-6 text-gray-900">The Merritt Experience</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Whether you're seeking personal practice, community connection, or the perfect venue for your event, our doors are open to welcome you home.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">For Practitioners</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Find your flow in our light-filled sanctuary. From gentle yoga to dynamic movement, sound baths to silent meditation, every practice is elevated by the sacred energy of this historic space.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Premium yoga and meditation classes</li>
                <li>• Workshops and wellness events</li>
                <li>• Community gatherings</li>
                <li>• Private sessions available</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">For Event Hosts</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Create unforgettable experiences in our inspiring venue. With its stunning architecture and peaceful ambiance, Merritt Fitness provides the perfect backdrop for workshops, retreats, and special events.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Intimate workshop space</li>
                <li>• Historic architectural details</li>
                <li>• Natural light and acoustics</li>
                <li>• Flexible event hosting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Heritage Note */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 text-emerald-400 mb-4">
            <Heart size={20} />
            <span className="text-sm font-medium uppercase tracking-wide">Our Heritage</span>
          </div>
          <p className="text-lg leading-relaxed text-gray-300">
            Every visit to Merritt Fitness is a step into living history. As you practice in our sanctuary, you join a continuum of community, growth, and connection that spans more than a century. This building has witnessed countless moments of joy, reflection, and transformation—and now it's ready to witness yours.
          </p>
        </div>
      </section>
    </main>
  );
}