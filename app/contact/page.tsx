import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook, ArrowRight, Calendar } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="max-w-2xl mx-auto pt-32 pb-24 px-4">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-light mb-6 text-gray-900">Let's Connect</h1>
        <p className="text-xl text-gray-600 leading-relaxed max-w-lg mx-auto">
          Step into our sacred space where wellness meets community. Whether you're ready to begin your journey or curious about what we offer, we're here to welcome you home.
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Primary Contact */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-6 text-gray-900">Reach Out</h3>
          <div className="space-y-4">
            <a
              href="tel:720-357-9499"
              className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors group"
            >
              <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                <Phone size={18} />
              </div>
              <span className="font-medium">(720) 357-9499</span>
            </a>
            <a
              href="mailto:manager@merrittfitness.net"
              className="flex items-center gap-3 text-gray-700 hover:text-rose-600 transition-colors group"
            >
              <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                <Mail size={18} />
              </div>
              <span className="font-medium">manager@merrittfitness.net</span>
            </a>
          </div>
        </div>

        {/* Visit Us */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-6 text-gray-900">Visit Our Sanctuary</h3>
          <div className="flex items-start gap-3 text-gray-700">
            <div className="p-2 bg-blue-50 rounded-lg mt-1">
              <MapPin size={18} />
            </div>
            <div>
              <p className="font-medium leading-relaxed">
                2246 Irving St<br />
                Denver, CO 80211
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Near Sloan's Lake • Historic 1905 Church
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social & Tour Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-12">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Stay Connected</h3>
          <div className="flex justify-center gap-4">
            <Link
              href="https://www.instagram.com/merritt.fitness"
              className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-gray-600 hover:text-pink-600"
              target="_blank" 
              rel="noopener"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={20} />
            </Link>
            <Link
              href="https://www.facebook.com/merritt.fitness"
              className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-gray-600 hover:text-blue-600"
              target="_blank" 
              rel="noopener"
              aria-label="Follow us on Facebook"
            >
              <Facebook size={20} />
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-amber-600 mb-3">
              <Calendar size={18} />
              <span className="font-medium">Private Tours Available</span>
            </div>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Experience the energy of our historic space before your first class. Call or email to schedule your personal walkthrough.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <p className="text-lg text-gray-600 mb-8">
          Ready to begin your wellness journey?
        </p>
        <Link
          href="/booking"
          className="inline-flex items-center gap-3 bg-gray-900 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-gray-800 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Book Your Class
          <ArrowRight size={20} />
        </Link>
        <p className="text-sm text-gray-500 mt-4">
          New to our space? Your first class is just the beginning.
        </p>
      </div>
    </main>
  );
}