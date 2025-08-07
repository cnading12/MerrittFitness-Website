'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Calendar } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScroll = useRef(0);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Scroll hide/show and background change for navbar
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      
      // Change background after scrolling past 50px
      setScrolled(current > 50);
      
      if (current <= 0) {
        setShowNav(true);
        lastScroll.current = 0;
        return;
      }
      if (current < lastScroll.current) {
        setShowNav(true);
      } else if (current > lastScroll.current) {
        setShowNav(false);
        setMenuOpen(false); // Close mobile menu when scrolling down
      }
      lastScroll.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 w-full top-0 left-0 transition-all duration-300 ease-in-out
        ${showNav || menuOpen ? 'translate-y-0' : '-translate-y-full'}
      `}
      style={{ willChange: 'transform' }}
    >
      {/* Desktop Navbar */}
      <div className={`w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 z-50 group" tabIndex={0}>
            <Image
              src="/images/hero/logo.png"
              alt="Merritt Fitness Logo"
              width={120}
              height={52}
              className="transition-transform duration-200 group-hover:scale-105"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="relative font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 py-2 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
            
            {/* Book Now CTA */}
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-gray-900 text-white font-medium px-5 py-2.5 rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
            >
              <Calendar size={16} />
              Book Now
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-gray-700 hover:text-gray-900 z-50 relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="relative w-6 h-6">
              <span className={`absolute top-2 left-0 w-6 h-0.5 bg-current transition-all duration-300 ${
                menuOpen ? 'rotate-45 top-2.5' : ''
              }`}></span>
              <span className={`absolute top-3.5 left-0 w-6 h-0.5 bg-current transition-opacity duration-300 ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}></span>
              <span className={`absolute top-5 left-0 w-6 h-0.5 bg-current transition-all duration-300 ${
                menuOpen ? '-rotate-45 top-2.5' : ''
              }`}></span>
            </div>
          </button>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <div className={`
        md:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out
        ${menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
      `}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        ></div>
        
        {/* Drawer */}
        <div className={`
          absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl
          transition-transform duration-300 ease-out
          ${menuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100">
            <Link
              href="/"
              className="flex items-center shrink-0"
              onClick={() => setMenuOpen(false)}
              tabIndex={0}
            >
              <Image
                src="/images/hero/logo.png"
                alt="Merritt Fitness Logo"
                width={110}
                height={48}
                priority
              />
            </Link>
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-6">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium text-lg py-3 px-4 rounded-xl transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* Mobile Book CTA */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link
                href="/booking"
                className="flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold py-4 px-6 rounded-2xl hover:bg-gray-800 transition-all duration-200 hover:scale-105 shadow-lg"
                onClick={() => setMenuOpen(false)}
              >
                <Calendar size={20} />
                Book Your Class
              </Link>
              <p className="text-center text-sm text-gray-500 mt-3">
                Ready to begin your journey?
              </p>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}