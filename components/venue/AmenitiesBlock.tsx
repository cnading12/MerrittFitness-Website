import { amenities } from '@/app/data/site';
import { Check } from 'lucide-react';

interface AmenitiesBlockProps {
  heading?: string;
  items?: ReadonlyArray<string>;
}

export default function AmenitiesBlock({ heading = 'Amenities', items = amenities }: AmenitiesBlockProps) {
  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif mb-10">{heading}</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((amenity) => (
          <li key={amenity} className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 border border-[#735e59]/10">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#735e59]/10 text-[#735e59] shrink-0">
              <Check size={16} />
            </span>
            <span className="text-[#4a3f3c]">{amenity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
