import Link from "next/link";
import { Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react";
import { navItems, contact } from "@/app/data/site";

export default function Footer() {
  return (
    <footer className="bg-[#f2eee9] border-t border-[#735e59]/10 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Site navigation + visit/contact, one compact row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {navItems
            .filter((item) => item.children)
            .map((item) => (
              <div key={item.label}>
                <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-3">
                  {item.label}
                </span>
                <ul className="space-y-1.5">
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
            <ul className="space-y-1.5">
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
              <li>
                <Link
                  href="/venue-facts"
                  className="text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                >
                  Venue Facts &amp; Rates
                </Link>
              </li>
              {/* /contact is deliberately linked from the footer only. It
                  exists for people (and crawlers) searching for the venue's
                  address, hours, and phone number, but the navbar is kept as
                  it is. */}
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                >
                  Contact &amp; Directions
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
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
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span>
                  {contact.address.street}, {contact.address.city}, {contact.address.state}{" "}
                  {contact.address.zip}
                </span>
              </a>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-1.5">
                New Events &amp; Tours
              </span>
              <div className="space-y-1">
                <a
                  href={contact.inquiries.phoneHref}
                  className="flex items-center gap-2 text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                >
                  <Phone size={14} />
                  {contact.inquiries.phone}
                </a>
                <a
                  href={`mailto:${contact.inquiries.email}`}
                  className="flex items-center gap-2 text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200 break-all"
                >
                  <Mail size={14} className="shrink-0" />
                  {contact.inquiries.email}
                </a>
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#a08b84] mb-1.5">
                Client Services
              </span>
              <div className="space-y-1">
                <a
                  href={contact.clientServices.phoneHref}
                  className="flex items-center gap-2 text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200"
                >
                  <Phone size={14} />
                  {contact.clientServices.phone}
                </a>
                <a
                  href={`mailto:${contact.clientServices.email}`}
                  className="flex items-center gap-2 text-sm text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200 break-all"
                >
                  <Mail size={14} className="shrink-0" />
                  {contact.clientServices.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Slim bottom row: copyright + social */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#735e59]/10 pt-5">
          <div className="text-[#a08b84] text-xs font-sans">
            © {new Date().getFullYear()} Merritt Wellness. All rights reserved.
          </div>
          <div className="flex items-center gap-5 text-[#6b5f5b]">
            <Link
              href={contact.social.instagram}
              className="hover:text-[#735e59] transition-colors duration-200"
              target="_blank"
              rel="noopener"
              aria-label="Merritt Wellness on Instagram"
            >
              <Instagram size={18} />
            </Link>
            <Link
              href={contact.social.facebook}
              className="hover:text-[#735e59] transition-colors duration-200"
              target="_blank"
              rel="noopener"
              aria-label="Merritt Wellness on Facebook"
            >
              <Facebook size={18} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
