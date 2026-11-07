import { Clock, Hotel, Plane, Star } from 'lucide-react';
import type { Package } from '../../types';
import type { PublicPage } from './WebsiteRouter';
import ShareButton from './ShareButton';
import { packageShareUrl } from '../../lib/share-urls';
import { CopyLink } from './site/cards';
import { formatEGP, hasAmount } from './site/siteData';

interface PublicPackageCardProps {
  p: Package;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
  dark?: boolean;
  compact?: boolean;
}

function priceRows(p: Package) {
  return [
    { label: 'بالغ', value: p.price },
    { label: 'ثنائية', value: p.price_double },
    { label: 'ثلاثية', value: p.price_triple },
    { label: 'رباعية', value: p.price_quad },
    { label: 'طفل', value: p.price_child },
    { label: 'رضيع', value: p.price_infant },
  ].filter((item) => hasAmount(item.value));
}

function PriceGrid({ p, compact = false }: { p: Package; compact?: boolean }) {
  const prices = priceRows(p);
  if (prices.length === 0) return null;
  return (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
      {prices.map((item) => (
        <div key={item.label} className="pm-price-cell">
          <span>{item.label}</span>
          <b>{formatEGP(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

function Media({ p, className }: { p: Package; className: string }) {
  return (
    <div className={`pm-card-media ${className}`}>
      {p.image_url
        ? <img src={p.image_url} alt={p.name} loading="lazy" />
        : <div className="pm-media-fallback pm-pattern"><Plane size={40} /></div>}
    </div>
  );
}

export default function PublicPackageCard({ p, onNavigate, compact = false }: PublicPackageCardProps) {
  const pkgUrl = packageShareUrl(p.id);
  const book = () => onNavigate('booking', { packageId: p.id, type: p.type });
  const details = () => onNavigate('package-details', undefined, p.id);

  if (compact) {
    return (
      <article className="pm-card flex">
        <Media p={p} className="w-32 flex-none" />
        <div className="p-4 flex-1 min-w-0 flex flex-col gap-2">
          <h3 className="text-[17px] line-clamp-1">{p.name}</h3>
          {p.duration_days ? <div className="pm-meta"><div><Clock size={13} /> {p.duration_days} يوم</div></div> : null}
          <PriceGrid p={p} compact />
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={details} className="pm-btn pm-btn-ghost pm-btn-sm">التفاصيل</button>
            <button type="button" onClick={book} className="pm-btn pm-btn-gold pm-btn-sm">احجز</button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="pm-card flex flex-col">
      <div className="relative">
        <Media p={p} className="h-52" />
        {p.featured && <span className="pm-pill gold absolute top-3 right-3"><Star size={11} fill="currentColor" /> مميزة</span>}
        <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
          <ShareButton title={p.name} compact shareUrl={pkgUrl} />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <span className="pm-pill soft mb-2">{p.type}</span>
          <h3 className="text-xl">{p.name}</h3>
        </div>
        {p.description && <p className="text-sm text-pm-muted line-clamp-2">{p.description}</p>}

        {(p.duration_days || p.hotel || p.hotel_makkah || p.hotel_madinah || p.airline) && (
          <div className="pm-meta">
            {p.duration_days ? <div><Clock size={14} /> {p.duration_days} يوم</div> : null}
            {p.hotel && <div><Hotel size={14} /> {p.hotel}</div>}
            {p.hotel_makkah && <div><Hotel size={14} /> مكة: {p.hotel_makkah}</div>}
            {p.hotel_madinah && <div><Hotel size={14} /> المدينة: {p.hotel_madinah}</div>}
            {p.airline && <div><Plane size={14} /> {p.airline}</div>}
          </div>
        )}

        <div className="mt-auto pt-3 pm-divider">
          <p className="text-[13px] font-semibold text-pm-ink mb-2">الأسعار المتاحة</p>
          <PriceGrid p={p} />
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={details} className="pm-btn pm-btn-teal pm-btn-sm flex-1">عرض التفاصيل</button>
          <button type="button" onClick={book} className="pm-btn pm-btn-gold pm-btn-sm flex-1">احجز الآن</button>
        </div>
        <CopyLink url={pkgUrl} label="نسخ رابط الباقة" />
      </div>
    </article>
  );
}
