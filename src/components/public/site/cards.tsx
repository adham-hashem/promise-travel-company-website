import { useState } from 'react';
import { CheckCircle2, Clock, Hotel as HotelIcon, Link2, MapPin, Star, Tag } from 'lucide-react';
import type { Hotel, OfferType } from '../../../types';
import ShareButton from '../ShareButton';
import { offerShareUrl } from '../../../lib/share-urls';
import { formatEGP, hotelShareUrl, offerPricing, type OfferWithPackage } from './siteData';
import type { NavFn } from './sections';

export function Stars({ count, size = 11 }: { count: number; size?: number }) {
  return (
    <span className="pm-pill glass" aria-label={`${count} نجوم`}>
      {Array.from({ length: count }).map((_, i) => <Star key={i} size={size} fill="currentColor" style={{ color: 'var(--gold-deep)' }} />)}
    </span>
  );
}

export function CopyLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
      }}
      className="w-full mt-2 flex items-center justify-center gap-1.5 text-[12.5px] py-1.5 rounded-lg text-pm-muted hover:text-pm-gold-deep transition-colors"
    >
      {copied ? <CheckCircle2 size={13} /> : <Link2 size={13} />}
      {copied ? 'تم نسخ الرابط' : label}
    </button>
  );
}

/* ---------------- Hotel ---------------- */

export function HotelCard({ hotel, onNavigate, full = false }: { hotel: Hotel; onNavigate: NavFn; full?: boolean }) {
  const open = () => onNavigate('hotel-details', undefined, hotel.id);
  return (
    <article
      className="pm-card flex flex-col"
      role={full ? undefined : 'link'}
      tabIndex={full ? undefined : 0}
      onClick={full ? undefined : open}
      onKeyDown={full ? undefined : (e) => { if (e.key === 'Enter') open(); }}
    >
      <div className={`pm-card-media ${full ? 'h-52' : 'h-40'}`}>
        {hotel.images?.[0]
          ? <img src={hotel.images[0]} alt={hotel.name} loading="lazy" />
          : <div className="pm-media-fallback"><HotelIcon size={full ? 46 : 36} /></div>}
        {hotel.stars > 0 && <div className="absolute top-3 right-3"><Stars count={hotel.stars} /></div>}
        {full && <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}><ShareButton title={hotel.name} compact shareUrl={hotelShareUrl(hotel.id)} /></div>}
      </div>
      <div className={`${full ? 'p-5' : 'p-4'} flex-1 flex flex-col gap-2`}>
        <h3 className={full ? 'text-xl' : 'text-[17px] line-clamp-1'}>{hotel.name}</h3>
        <div className="pm-meta"><div><MapPin size={14} />{hotel.city}{hotel.country ? `، ${hotel.country}` : ''}</div></div>
        {full && hotel.services?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {hotel.services.slice(0, 4).map((s) => <span key={s} className="pm-pill line" style={{ fontSize: 12 }}>{s}</span>)}
            {hotel.services.length > 4 && <span className="text-xs text-pm-muted self-center">+{hotel.services.length - 4}</span>}
          </div>
        )}
        <div className="mt-auto pt-3 pm-divider flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[12px] text-pm-muted">يبدأ من / لليلة</p>
            <p className="pm-price" style={{ fontSize: full ? 22 : 18 }}>{formatEGP(hotel.price_per_night)}</p>
          </div>
          {full ? (
            <div className="flex gap-2">
              <button type="button" onClick={open} className="pm-btn pm-btn-teal pm-btn-sm">التفاصيل</button>
              <button type="button" onClick={() => onNavigate('booking', { type: 'فندق' })} className="pm-btn pm-btn-gold pm-btn-sm">احجز</button>
            </div>
          ) : (
            <span className="pm-link" style={{ fontSize: 14 }}>التفاصيل ←</span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------------- Offer ---------------- */

const typeLabels: Record<OfferType, string> = { 'حج': 'حج', 'عمرة': 'عمرة', 'داخلي': 'رحلات داخلية' };

export function OfferCard({ offer: o, onNavigate, withCopy = false }: { offer: OfferWithPackage; onNavigate: NavFn; withCopy?: boolean }) {
  const { original, discounted } = offerPricing(o);
  const img = o.image_url || o.packages?.image_url;
  const typeLabel = o.type ? typeLabels[o.type] : o.packages?.type;
  const offerType = o.type || o.packages?.type || 'عمرة';
  const url = offerShareUrl(o.id);
  const open = () => onNavigate('offer-details', undefined, o.id);

  return (
    <article className="pm-card flex flex-col" role="link" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }}>
      <div className="pm-card-media h-48">
        {img ? <img src={img} alt={o.name} loading="lazy" /> : <div className="pm-media-fallback"><Tag size={44} /></div>}
        <span className="pm-pill gold absolute top-3 right-3" style={{ fontSize: 14 }}><Tag size={13} /> خصم {o.discount_percentage}%</span>
        <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}><ShareButton title={o.name} compact shareUrl={url} /></div>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-2">
        {typeLabel && <span className="pm-pill soft w-fit">{typeLabel}</span>}
        <h3 className="text-xl">{o.name}</h3>
        {o.description && <p className="text-sm text-pm-muted line-clamp-2">{o.description}</p>}
        <div className="pm-meta"><div><Clock size={14} /> ينتهي في {new Date(o.end_date).toLocaleDateString('ar-EG')}</div></div>
        <div className="mt-auto pt-3 pm-divider">
          {original != null && discounted != null && <p className="pm-price-old">{formatEGP(original)}</p>}
          {discounted != null ? <p className="pm-price">{formatEGP(discounted)}</p> : <p className="pm-price" style={{ fontSize: 18 }}>على الباقة</p>}
        </div>
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); open(); }} className="pm-btn pm-btn-teal pm-btn-sm flex-1">التفاصيل</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onNavigate('booking', { packageId: o.package_id || o.packages?.id, type: offerType }); }} className="pm-btn pm-btn-gold pm-btn-sm flex-1">احجز الآن</button>
        </div>
        {withCopy && <CopyLink url={url} label="نسخ رابط العرض" />}
      </div>
    </article>
  );
}
