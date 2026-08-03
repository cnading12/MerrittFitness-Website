import { SPECS } from '@/app/data/venue';

interface Spec {
  value: string;
  label: string;
}

// The building's numbers, shared by every event-type page. `items` can
// override the default set when a page wants a different emphasis.
export function defaultSpecs(): Spec[] {
  return [
    { value: `${SPECS.capacity}`, label: 'Guest capacity' },
    { value: `${SPECS.ceilingFeet} ft`, label: 'Cathedral ceilings' },
    { value: SPECS.mainHallSqFt.toLocaleString('en-US'), label: 'Sq ft main hall' },
    { value: SPECS.upstairsSqFt.toLocaleString('en-US'), label: 'Sq ft upstairs' },
    { value: SPECS.totalSqFt.toLocaleString('en-US'), label: 'Sq ft full building' },
    { value: `${SPECS.parkingSpots}`, label: 'On-site parking spots' },
  ];
}

export default function SpecsBlock({
  heading = 'The space',
  items,
}: {
  heading?: string;
  items?: Spec[];
}) {
  const specs = items ?? defaultSpecs();
  return (
    <section className="py-16 bg-[#f2eee9]/60">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-light text-[#4a3f3c] font-serif text-center mb-10">
          {heading}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="bg-white rounded-2xl px-4 py-6 text-center shadow-sm border border-[#735e59]/10"
            >
              <div className="text-2xl sm:text-3xl font-bold text-[#735e59] font-serif mb-1">
                {spec.value}
              </div>
              <div className="text-xs sm:text-sm text-[#6b5f5b] uppercase tracking-wide">
                {spec.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
