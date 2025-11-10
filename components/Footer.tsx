import Link from "next/link";
import { Instagram, Facebook, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-5 px-4">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600 text-sm">
          <Link
            href="https://www.instagram.com/YOUR_INSTAGRAM_HANDLE"
            className="flex items-center gap-1 hover:text-blue-500 transition"
            target="_blank" rel="noopener"
          >
            <Instagram size={18} /> Instagram
          </Link>
          <Link
            href="https://www.facebook.com/YOUR_FACEBOOK_PAGE"
            className="flex items-center gap-1 hover:text-blue-700 transition"
            target="_blank" rel="noopener"
          >
            <Facebook size={18} /> Facebook
          </Link>
          <a
            href="tel:720-357-9499"
            className="flex items-center gap-1 hover:text-green-600 transition"
          >
            <Phone size={18} /> (720) 357-9499
          </a>
          <a
            href="mailto:manager@merrittwellness.net"
            className="flex items-center gap-1 hover:text-rose-700 transition"
          >
            <Mail size={18} /> manager@merrittwellness.net
          </a>
        </div>
        <div className="text-gray-400 text-xs text-center mt-2">
          © {new Date().getFullYear()} Merritt Wellness. All rights reserved.
        </div>
      </div>
    </footer>
  );
}