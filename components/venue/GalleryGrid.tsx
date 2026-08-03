'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getBlurDataURL } from '@/lib/blur-data';

export interface GalleryImage {
  src: string;
  alt: string;
}

// Photo grid used by the event-type pages. Degrades gracefully: a tile whose
// file fails to load removes itself instead of breaking the layout, and
// labeled placeholder slots mark shots the venue still needs to photograph.
export default function GalleryGrid({
  images,
  placeholders = [],
}: {
  images: GalleryImage[];
  placeholders?: string[];
}) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const visible = images.filter((img) => !failed[img.src]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visible.map((img) => (
        <div key={img.src} className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md">
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover hover:scale-105 transition-transform duration-500"
            loading="lazy"
            placeholder="blur"
            blurDataURL={getBlurDataURL(img.src)}
            onError={() => setFailed((prev) => ({ ...prev, [img.src]: true }))}
          />
        </div>
      ))}
      {placeholders.map((label) => (
        <div
          key={label}
          className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-[#735e59]/25 bg-[#f2eee9]/50 flex items-center justify-center p-6 text-center"
        >
          <span className="text-sm text-[#a08b84] leading-snug">{label}: photo coming soon</span>
        </div>
      ))}
    </div>
  );
}
