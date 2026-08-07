'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  // The mobile menu renders through a portal; wait for mount so SSR markup
  // stays consistent.
  const [mounted, setMounted] = useState(false);
  const lastScroll = useRef(0);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

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
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setMenuOpen(false);
      }
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

      {/* Mobile menu — rendered via portal to <body>: the transformed fixed
          header cannot be its containing block, so the overlay truly covers
          the viewport. Full-screen takeover, every destination one tap away. */}
      {mounted && createPortal(
        <div
          className={`lg:hidden fixed inset-0 z-[70] transition-all duration-300 ease-out ${
            menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="absolute inset-0 bg-[#f2eee9]" />
          <div className={`relative flex h-[100dvh] flex-col transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-y-0' : '-translate-y-2'
          }`}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
              <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center">
                <Image
                  src="/images/hero/logo.png"
                  alt="Merritt Wellness Logo"
                  width={130}
                  height={56}
                  className="h-auto w-[120px]"
                  placeholder="blur"
                  blurDataURL={getBlurDataURL("/images/hero/logo.png")}
                />
              </Link>
              <button
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#735e59] hover:bg-[#735e59]/10 transition-colors duration-200"
              >
                <X size={26} />
              </button>
            </div>

            {/* Destinations */}
            <nav className="flex-1 overflow-y-auto px-7 pt-2 pb-4">
              {navItems.filter((item) => item.children).map((group, gi) => (
                <div key={group.label} className={gi > 0 ? 'mt-7' : ''}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a08b84] mb-2">
                    {group.label}
                  </p>
                  <ul>
                    {group.children!.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 py-[7px] font-serif text-[22px] leading-snug transition-colors duration-150 ${
                            pathname === child.href
                              ? 'font-bold text-[#735e59]'
                              : 'text-[#4a3f3c] active:text-[#735e59]'
                          }`}
                        >
                          {pathname === child.href && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#735e59] shrink-0" />
                          )}
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="mt-7 pt-6 border-t border-[#735e59]/15">
                <ul>
                  {navItems.filter((item) => !item.children).map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href!}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 py-[7px] font-serif text-[22px] leading-snug transition-colors duration-150 ${
                          pathname === item.href
                            ? 'font-bold text-[#735e59]'
                            : 'text-[#4a3f3c] active:text-[#735e59]'
                        }`}
                      >
                        {pathname === item.href && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#735e59] shrink-0" />
                        )}
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Pinned actions */}
            <div className="px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 border-t border-[#735e59]/15 bg-[#f2eee9]">
              <Link
                href="/book"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 bg-[#735e59] text-[#f2eee9] font-semibold py-4 rounded-2xl active:bg-[#5a4a46] transition-colors duration-200 shadow-lg"
              >
                <Calendar size={20} />
                Book the Venue
              </Link>
              <a
                href="tel:720-357-9499"
                className="block text-center text-sm text-[#735e59]/80 mt-3"
              >
                Questions? Call (720) 357-9499
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
