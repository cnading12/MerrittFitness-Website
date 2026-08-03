import Link from "next/link";
import { Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react";
import { navItems, contact } from "@/app/data/site";

export default function Footer() {
  return (
    <footer className="bg-[#f2eee9] border-t border-[#735e59]/10 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        {/* Site navigation columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {navItems
            .filter((item) => item.children)
            .map((item) => (
              <div key={item.label}>
                <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-3">
                  {item.label}
                </span>
                <ul className="space-y-2">
                  {item.children!.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className="text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-3">
              Explore
            </span>
            <ul className="space-y-2">
              {navItems
                .filter((item) => !item.children && item.href !== "/")
                .map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href!}
                      className="text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/book"
                  className="text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                >
                  Book the Venue
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-3">
              Visit
            </span>
            <a
              href="https://maps.google.com/?q=2246+Irving+Street+Denver+CO+80211"
              target="_blank"
              rel="noopener"
              className="flex items-start gap-2 text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
            >
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>
                {contact.address.street}
                <br />
                {contact.address.city}, {contact.address.state} {contact.address.zip}
                <br />
                <span className="text-[#a08b84]">{contact.address.neighborhood}</span>
              </span>
            </a>
          </div>
        </div>

        {/* Two points of contact: Manager (new events) vs Client Services (booked events) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10 text-[#6b5f5b] text-sm font-sans border-t border-[#735e59]/10 pt-8">
          <div className="flex flex-col items-center sm:items-start gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a08b84]">New Events &amp; Tours</span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <a
                href={contact.inquiries.phoneHref}
                className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
              >
                <Phone size={16} />
                <span>{contact.inquiries.phone}</span>
              </a>
              <a
                href={`mailto:${contact.inquiries.email}`}
                className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
              >
                <Mail size={16} />
                <span className="hidden md:inline">{contact.inquiries.email}</span>
                <span className="md:hidden">Email</span>
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a08b84]">Client Services</span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <a
                href={contact.clientServices.phoneHref}
                className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
              >
                <Phone size={16} />
                <span>{contact.clientServices.phone}</span>
              </a>
              <a
                href={`mailto:${contact.clientServices.email}`}
                className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
              >
                <Mail size={16} />
                <span className="hidden md:inline">{contact.clientServices.email}</span>
                <span className="md:hidden">Email</span>
              </a>
            </div>
          </div>
        </div>

        {/* Social + copyright */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-[#6b5f5b] text-sm font-sans">
            <Link
              href={contact.social.instagram}
              className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
              target="_blank"
              rel="noopener"
            >
              <Instagram size={18} />
              <span className="hidden sm:inline">Instagram</span>
            </Link>
            <Link
              href={contact.social.facebook}
              className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
              target="_blank"
              rel="noopener"
            >
              <Facebook size={18} />
              <span className="hidden sm:inline">Facebook</span>
            </Link>
          </div>

          <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#735e59]/30 to-transparent"></div>

          <div className="text-[#a08b84] text-xs text-center font-sans">
            © {new Date().getFullYear()} Merritt Wellness. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
