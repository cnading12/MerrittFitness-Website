import Link from "next/link";
import { Instagram, Facebook, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#f2eee9] border-t border-[#735e59]/10 py-8 px-4">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
        {/* Social & Contact Links */}
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
            href="https://www.facebook.com/MerrittFitnessSpace/"
            className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
            target="_blank" 
            rel="noopener"
          >
            <Facebook size={18} /> 
            <span className="hidden sm:inline">Facebook</span>
          </Link>
          <a
            href="tel:720-357-9499"
            className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
          >
            <Phone size={18} /> 
            <span>(720) 357-9499</span>
          </a>
          <a
            href="mailto:manager@merrittwellness.net"
            className="flex items-center gap-2 hover:text-[#735e59] transition-colors duration-200"
          >
            <Mail size={18} /> 
            <span className="hidden md:inline">manager@merrittwellness.net</span>
            <span className="md:hidden">Email</span>
          </a>
        </div>
        
        {/* Divider */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#735e59]/30 to-transparent"></div>
        
        {/* Copyright */}
        <div className="text-[#a08b84] text-xs text-center font-sans">
          © {new Date().getFullYear()} Merritt Wellness. All rights reserved.
        </div>
      </div>
    </footer>
  );
}