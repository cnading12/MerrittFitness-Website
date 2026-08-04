import Image from 'next/image';
import Link from 'next/link';
import { getBlurDataURL } from '@/lib/blur-data';

export interface HeroCta {
  label: string;
  href: string;
  variant?: 'primary' | 'ghost';
}

interface PageHeroProps {
  image: { src: string; alt: string };
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  ctas?: HeroCta[];
  /** Vertical size; weddings uses tall, most pages default */
  size?: 'default' | 'tall';
}

export default function PageHero({ image, eyebrow, title, subtitle, ctas = [], size = 'default' }: PageHeroProps) {
  return (
    // pt-28 keeps the vertically-centered content clear of the fixed navbar
    // (~110px tall) instead of letting the headline slide underneath it on
    // shorter viewports; the darker top gradient gives the translucent cream
    // bar a consistent edge to sit on.
    <section className={`relative flex items-center justify-center overflow-hidden pt-28 ${
      size === 'tall' ? 'min-h-[92svh]' : 'min-h-[70svh]'
    }`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        sizes="100vw"
        placeholder={getBlurDataURL(image.src) ? 'blur' : 'empty'}
        blurDataURL={getBlurDataURL(image.src)}
        className="object-cover brightness-[0.6]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-16 text-center animate-fade-in-up">
        {eyebrow && (
          <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/15 backdrop-blur-sm text-[#f2eee9] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-[#f2eee9] leading-tight font-serif mb-6">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-[#f2eee9]/90 max-w-2xl mx-auto leading-relaxed mb-10">
            {subtitle}
          </p>
        )}
        {ctas.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {ctas.map((cta) => (
              <Link
                key={cta.href + cta.label}
                href={cta.href}
                className={
                  cta.variant === 'ghost'
                    ? 'inline-flex items-center justify-center border-2 border-[#f2eee9]/70 text-[#f2eee9] font-bold px-10 py-5 rounded-full backdrop-blur-sm hover:bg-[#f2eee9]/10 hover:-translate-y-1 transition-all duration-300'
                    : 'inline-flex items-center justify-center bg-[#735e59] text-[#f2eee9] font-bold px-10 py-5 rounded-full shadow-lg hover:bg-[#5a4a46] hover:-translate-y-1 transition-all duration-300'
                }
              >
                {cta.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
