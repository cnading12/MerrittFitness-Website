import Image from 'next/image';
import Link from 'next/link';
import { getBlurDataURL } from '@/lib/blur-data';

interface Cta {
  href: string;
  label: string;
}

// Shared full-width hero for the event-type and partnership pages. Keeps the
// homepage's warm-overlay treatment so every page opens on the building.
export default function PageHero({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  objectPosition = 'center',
}: {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  objectPosition?: string;
}) {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        placeholder="blur"
        blurDataURL={getBlurDataURL(image)}
        sizes="100vw"
        className="object-cover brightness-75"
        style={{ objectPosition }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#735e59]/60 via-[#735e59]/25 to-[#735e59]/65"></div>

      <div className="relative z-10 text-center text-[#f2eee9] px-6 py-32 max-w-4xl mx-auto">
        {eyebrow && (
          <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/10 backdrop-blur-sm text-[#f2eee9]/90 text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl md:text-6xl font-light leading-tight font-serif mb-6 drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto opacity-95 drop-shadow-md mb-10">
            {subtitle}
          </p>
        )}
        {(primaryCta || secondaryCta) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className="bg-[#f2eee9] text-[#735e59] font-semibold px-10 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1"
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="border-2 border-[#f2eee9]/70 text-[#f2eee9] font-semibold px-10 py-4 rounded-full backdrop-blur-sm hover:bg-[#f2eee9] hover:text-[#735e59] transition-all duration-300"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
