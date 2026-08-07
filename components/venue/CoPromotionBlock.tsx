import { coPromotion } from '@/app/data/site';
import { Megaphone, Check } from 'lucide-react';

// The public-event co-promotion pitch: bulletin board, What's On calendar,
// social channels. Shown on event pages where hosts might assume marketing
// is on them alone.
export default function CoPromotionBlock() {
  return (
    <div className="bg-[#735e59] rounded-3xl p-10 md:p-12">
      <span className="inline-flex items-center px-4 py-2 bg-[#f2eee9]/15 text-[#f2eee9] text-sm font-semibold rounded-full tracking-wide uppercase mb-6">
        <Megaphone className="w-4 h-4 mr-2" />
        Included with public events
      </span>
      <h2 className="text-2xl md:text-3xl font-light text-[#f2eee9] font-serif mb-4">
        {coPromotion.heading}
      </h2>
      <p className="text-[#f2eee9]/85 leading-relaxed max-w-3xl mb-8">{coPromotion.body}</p>
      <ul className="flex flex-col sm:flex-row gap-4">
        {coPromotion.channels.map((channel) => (
          <li key={channel} className="flex items-center gap-2 text-[#f2eee9]">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#f2eee9]/15 shrink-0">
              <Check size={14} />
            </span>
            <span className="text-sm font-medium">{channel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
