import Link from "next/link";
import { Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react";

// The footer is the site's contact block — the standalone contact page was
// retired in the private-events restructure. Two points of contact: the
// manager for new events and tours, client services for already-booked events.
const EXPLORE_LINKS = [
  { label: "Weddings", href: "/weddings" },
  { label: "Concerts & Performances", href: "/concerts" },
  { label: "Art Shows & Exhibitions", href: "/art-shows" },
  { label: "All Private Events", href: "/private-events" },
];

const PARTNER_LINKS = [
  { label: "Recurring Class Partnerships", href: "/class-partnerships" },
  { label: "Congregation Partnerships", href: "/congregations" },
  { label: "Studio & Workspace", href: "/studio" },
  { label: "What's On", href: "/calendar" },
];

export default function Footer() {
  return (
    <footer className="bg-[#f2eee9] border-t border-[#735e59]/10 py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Explore + Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm font-sans">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a08b84]">Private Events</span>
            {EXPLORE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a08b84]">Classes & Community</span>
            {PARTNER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-[#6b5f5b] hover:text-[#735e59] transition-colors duration-200">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-[#6b5f5b]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a08b84]">New Events &amp; Tours</span>
            <a
              href="tel:720-357-9499"
              className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            >
              <Phone size={16} />
              <span>(720) 357-9499</span>
            </a>
            <a
              href="mailto:manager@merrittwellness.net"
              className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200 break-all"
            >
              <Mail size={16} className="shrink-0" />
              <span>manager@merrittwellness.net</span>
            </a>
            <span className="flex items-start gap-2 mt-1">
              <MapPin size={16} className="shrink-0 mt-0.5" />
              <span>2246 Irving St<br />Denver, CO 80211</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 text-[#6b5f5b]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a08b84]">Client Services</span>
            <span className="text-xs text-[#a08b84]">For already-booked events</span>
            <a
              href="tel:303-359-8337"
              className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            >
              <Phone size={16} />
              <span>(303) 359-8337</span>
            </a>
            <a
              href="mailto:clientservices@merrittwellness.net"
              className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200 break-all"
            >
              <Mail size={16} className="shrink-0" />
              <span>clientservices@merrittwellness.net</span>
            </a>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[#6b5f5b] text-sm font-sans">
          <Link
            href="https://www.instagram.com/merrittwellnessdenver/"
            className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            target="_blank"
            rel="noopener"
          >
            <Instagram size={18} />
            <span className="hidden sm:inline">Instagram</span>
          </Link>
          <Link
            href="https://www.facebook.com/MerrittWellnessDenver/"
            className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            target="_blank"
            rel="noopener"
          >
            <Facebook size={18} />
            <span className="hidden sm:inline">Facebook</span>
          </Link>
          <Link
            href="https://merrittworkspace.net"
            className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
          >
            <span>Merritt Workspace (next door)</span>
          </Link>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#735e59]/30 to-transparent mx-auto"></div>

        {/* Copyright */}
        <div className="text-[#a08b84] text-xs text-center font-sans">
          © {new Date().getFullYear()} Merritt Wellness. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
