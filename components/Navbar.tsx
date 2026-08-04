'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getBlurDataURL } from '@/lib/blur-data';
import Image from 'next/image';
import Link from 'next/link';
import { X, Calendar, ChevronDown } from 'lucide-react';
import { navItems } from '@/app/data/site';

// Routes whose pages open with a full-bleed photo hero. On these, the navbar
// starts fully transparent (light text over the darkened image) and gains its
// cream background on scroll; everywhere else it keeps the solid cream bar.
const HERO_ROUTES = new Set([
  '/',
  '/weddings',
  '/private-events',
  '/concerts',
  '/art-shows',
  '/class-partnerships',
  '/congregations',
  '/studio',
  '/recurring',
]);

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const lastScroll = useRef(0);
  const navRef = useRef<HTMLElement | null>(null);

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
        setOpenDropdown(null);
      }
      lastScroll.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Over a hero image the bar is transparent with light text; once scrolled
  // (or with the mobile drawer open) it becomes the solid cream bar.
  const overHero = HERO_ROUTES.has(pathname) && !scrolled && !menuOpen;
  const linkColor = overHero
    ? 'text-[#f2eee9] hover:text-white'
    : 'text-[#735e59] hover:text-[#5a4a46]';
  const underlineColor = overHero ? 'bg-[#f2eee9]' : 'bg-[#735e59]';

  return (
    <header
      className={`fixed z-50 w-full top-0 left-0 transition-all duration-300 ease-in-out
        ${showNav || menuOpen ? 'translate-y-0' : '-translate-y-full'}
      `}
      style={{ willChange: 'transform' }}
    >
      {/* Desktop Navbar */}
      <div className={`w-full transition-all duration-300 ${
        overHero
          ? 'bg-transparent'
          : scrolled
            ? 'bg-[#f2eee9]/95 backdrop-blur-md shadow-lg border-b border-[#735e59]/20'
            : 'bg-[#f2eee9]/95 backdrop-blur-sm'
      }`}>
        <nav ref={navRef} className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center min-w-0 z-50 group" tabIndex={0}>
            <Image
              src="/images/hero/logo.png"
              alt="Merritt Wellness Logo"
              width={160}
              height={70}
              className={`transition-all duration-300 group-hover:scale-105 max-w-[120px] sm:max-w-[160px] h-auto ${overHero ? 'brightness-0 invert' : ''}`}
              priority
              placeholder="blur"
              blurDataURL={getBlurDataURL("/images/hero/logo.png")}
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown((v) => (v === item.label ? null : v))}
                >
                  <button
                    className={`relative flex items-center gap-1 font-medium transition-colors duration-200 py-2 group ${linkColor}`}
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="true"
                    onClick={() => setOpenDropdown((v) => (v === item.label ? null : item.label))}
                  >
                    {item.label}
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`}
                    />
                    <span className={`absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${underlineColor}`}></span>
                  </button>
                  <div
                    className={`absolute left-0 top-full pt-2 transition-all duration-200 ${
                      openDropdown === item.label
                        ? 'opacity-100 visible translate-y-0'
                        : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                    }`}
                  >
                    <div className="bg-[#f2eee9] rounded-2xl shadow-xl border border-[#735e59]/15 py-2 min-w-[240px]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-5 py-2.5 text-[#735e59] hover:text-[#5a4a46] hover:bg-[#735e59]/10 font-medium transition-colors duration-150"
                          onClick={() => setOpenDropdown(null)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={`relative font-medium transition-colors duration-200 py-2 group ${linkColor}`}
                >
                  {item.label}
                  <span className={`absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${underlineColor}`}></span>
                </Link>
              )
            ))}

            {/* Book CTA */}
            <Link
              href="/book"
              className={`inline-flex items-center gap-2 font-medium px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md ${
                overHero
                  ? 'bg-[#f2eee9] text-[#735e59] hover:bg-white'
                  : 'bg-[#735e59] text-[#f2eee9] hover:bg-[#5a4a46]'
              }`}
            >
              <Calendar size={16} />
              Book
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className={`lg:hidden shrink-0 z-50 relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors duration-200 [-webkit-tap-highlight-color:transparent] ${
              overHero ? 'text-[#f2eee9] hover:bg-[#f2eee9]/15' : 'text-[#735e59] hover:text-[#5a4a46] hover:bg-[#735e59]/10'
            }`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="relative w-7 h-6">
              <span className={`absolute top-[4px] left-0 w-7 h-[3px] rounded-full transition-all duration-300 ${overHero ? "bg-[#f2eee9]" : "bg-[#735e59]"} ${
                menuOpen ? 'rotate-45 top-[11px]' : ''
              }`}></span>
              <span className={`absolute top-[11px] left-0 w-7 h-[3px] rounded-full transition-opacity duration-300 ${overHero ? "bg-[#f2eee9]" : "bg-[#735e59]"} ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}></span>
              <span className={`absolute top-[18px] left-0 w-7 h-[3px] rounded-full transition-all duration-300 ${overHero ? "bg-[#f2eee9]" : "bg-[#735e59]"} ${
                menuOpen ? '-rotate-45 top-[11px]' : ''
              }`}></span>
            </div>
          </button>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <div className={`
        lg:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out
        ${menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
      `}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-[#735e59]/20 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        ></div>

        {/* Drawer */}
        <div className={`
          absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-[#f2eee9] shadow-2xl
          transition-transform duration-300 ease-out flex flex-col
          ${menuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-[#735e59]/20 bg-[#f2eee9]">
            <Link
              href="/"
              className="flex items-center shrink-0"
              onClick={() => setMenuOpen(false)}
              tabIndex={0}
            >
              <Image
                src="/images/hero/logo.png"
                alt="Merritt Wellness Logo"
                width={140}
                height={60}
                priority
                placeholder="blur"
                blurDataURL={getBlurDataURL("/images/hero/logo.png")}
              />
            </Link>
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="text-[#735e59]/70 hover:text-[#735e59] p-2 rounded-full hover:bg-[#735e59]/10 transition-colors duration-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-6 bg-[#f2eee9] overflow-y-auto flex-1">
            <div className="space-y-1">
              {navItems.map((item) => (
                item.children ? (
                  <div key={item.label}>
                    <button
                      className="flex w-full items-center justify-between text-[#735e59] hover:text-[#5a4a46] hover:bg-[#735e59]/10 font-medium text-lg py-3 px-4 rounded-xl transition-all duration-200"
                      aria-expanded={mobileExpanded === item.label}
                      onClick={() => setMobileExpanded((v) => (v === item.label ? null : item.label))}
                    >
                      {item.label}
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${mobileExpanded === item.label ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${
                      mobileExpanded === item.label ? 'max-h-64' : 'max-h-0'
                    }`}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block text-[#735e59]/90 hover:text-[#5a4a46] hover:bg-[#735e59]/10 py-2.5 pl-8 pr-4 rounded-xl transition-all duration-200"
                          onClick={() => setMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className="block text-[#735e59] hover:text-[#5a4a46] hover:bg-[#735e59]/10 font-medium text-lg py-3 px-4 rounded-xl transition-all duration-200"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            {/* Mobile Book CTA */}
            <div className="mt-8 pt-6 border-t border-[#735e59]/20 bg-[#f2eee9]">
              <Link
                href="/book"
                className="flex items-center justify-center gap-2 bg-[#735e59] text-[#f2eee9] font-semibold py-4 px-6 rounded-2xl hover:bg-[#5a4a46] transition-all duration-200 hover:scale-105 shadow-lg"
                onClick={() => setMenuOpen(false)}
              >
                <Calendar size={20} />
                Book the Venue
              </Link>
              <p className="text-center text-sm text-[#735e59]/70 mt-3">
                Classes, events, and everything in between
              </p>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
