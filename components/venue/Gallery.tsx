'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { getBlurDataURL } from '@/lib/blur-data';

export interface GalleryImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface GalleryProps {
  images: GalleryImage[];
  /** Labeled slots for photography that does not exist yet */
  placeholders?: string[];
  heading?: string;
  subheading?: string;
}

export default function Gallery({ images, placeholders = [], heading, subheading }: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Files that fail to load are dropped from the grid so a missing derivative
  // never breaks the layout.
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const visible = images.filter((img) => !failed.has(img.src));

  const close = useCallback(() => setLightboxIndex(null), []);
  const step = useCallback((delta: number) => {
    setLightboxIndex((current) => {
      if (current === null || visible.length === 0) return current;
      return (current + delta + visible.length) % visible.length;
    });
  }, [visible.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, close, step]);

  return (
    <div>
      {heading && (
        <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-4">{heading}</h2>
      )}
      {subheading && <p className="text-[#6b5f5b] mb-10 max-w-2xl">{subheading}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-[4/3] rounded-3xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#735e59]"
            aria-label={`View larger: ${img.alt}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder={getBlurDataURL(img.src) ? 'blur' : 'empty'}
              blurDataURL={getBlurDataURL(img.src)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setFailed((prev) => new Set(prev).add(img.src))}
            />
          </button>
        ))}
        {placeholders.map((label) => (
          <div
            key={label}
            className="relative aspect-[4/3] rounded-3xl border-2 border-dashed border-[#735e59]/25 bg-[#735e59]/5 flex flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <ImageIcon size={28} className="text-[#735e59]/40" />
            <span className="text-sm text-[#6b5f5b]">{label}</span>
            <span className="text-xs uppercase tracking-wide text-[#a08b84]">Photo coming soon</span>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && visible[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Close image viewer"
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
          >
            <X size={28} />
          </button>
          {visible.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                aria-label="Previous image"
                className="absolute left-2 sm:left-6 text-white/80 hover:text-white p-2 z-10"
              >
                <ChevronLeft size={36} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); step(1); }}
                aria-label="Next image"
                className="absolute right-2 sm:right-6 text-white/80 hover:text-white p-2 z-10"
              >
                <ChevronRight size={36} />
              </button>
            </>
          )}
          <figure
            className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[75vh]">
              <Image
                src={visible[lightboxIndex].src}
                alt={visible[lightboxIndex].alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <figcaption className="text-white/70 text-sm mt-3 text-center">
              {visible[lightboxIndex].alt}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
