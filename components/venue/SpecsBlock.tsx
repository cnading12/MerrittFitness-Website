import { specItems } from '@/app/data/site';

interface SpecsBlockProps {
  heading?: string;
  /** Override the default site-wide spec list */
  items?: ReadonlyArray<{ label: string; value: string }>;
  /** Dark variant for use on brand-colored sections */
  onDark?: boolean;
}

export default function SpecsBlock({ heading = 'The Space', items = specItems, onDark = false }: SpecsBlockProps) {
  return (
    <div>
      {heading && (
        <h2 className={`text-3xl md:text-4xl font-light font-serif mb-10 ${onDark ? 'text-[#f2eee9]' : 'text-[#4a3f3c]'}`}>
          {heading}
        </h2>
      )}
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-3xl p-6 border ${
              onDark
                ? 'bg-[#f2eee9]/10 border-[#f2eee9]/15'
                : 'bg-white border-[#735e59]/10 shadow-sm'
            }`}
          >
            <dd className={`text-2xl md:text-3xl font-bold font-serif ${onDark ? 'text-[#f2eee9]' : 'text-[#735e59]'}`}>
              {item.value}
            </dd>
            <dt className={`mt-1 text-sm ${onDark ? 'text-[#f2eee9]/70' : 'text-[#6b5f5b]'}`}>
              {item.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
