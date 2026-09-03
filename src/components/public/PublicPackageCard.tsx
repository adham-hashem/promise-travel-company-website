import { useState } from 'react';
import { Baby, BedDouble, CheckCircle2, Clock, Hotel, Link2, Plane, Star, UserRound } from 'lucide-react';
import type { Package } from '../../types';
import type { PublicPage } from './WebsiteRouter';
import ShareButton from './ShareButton';
import { packageShareUrl } from '../../lib/share-urls';

interface PublicPackageCardProps {
  p: Package;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
  dark?: boolean;
  compact?: boolean;
}

const fallbackImage = 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=800';

const hasValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const formatPrice = (value: unknown) => `${Number(value).toLocaleString('ar-EG')} ج.م`;

function CopyPackageLink({ url, compact = false }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className={compact
        ? 'w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur text-emerald-950 hover:bg-white shadow-sm rounded-xl transition-all'
        : 'w-full mt-2 flex items-center justify-center gap-1.5 text-gray-400 hover:text-gold-600 font-medium text-[11px] py-1.5 rounded-lg hover:bg-gray-50 transition-all'}
      aria-label="نسخ رابط الباقة"
    >
      {copied ? <CheckCircle2 size={compact ? 16 : 12} className="text-emerald-600" /> : <Link2 size={compact ? 16 : 12} />}
      {!compact && (copied ? 'تم نسخ الرابط' : 'نسخ رابط الباقة')}
    </button>
  );
}

function PriceGrid({ p, compact = false }: { p: Package; compact?: boolean }) {
  const prices = [
    { label: 'بالغ', value: p.price, icon: UserRound },
    { label: 'ثنائية', value: p.price_double, icon: BedDouble },
    { label: 'ثلاثية', value: p.price_triple, icon: BedDouble },
    { label: 'رباعية', value: p.price_quad, icon: BedDouble },
    { label: 'طفل', value: p.price_child, icon: UserRound },
    { label: 'رضيع', value: p.price_infant, icon: Baby },
  ].filter((item) => hasValue(item.value));

  if (prices.length === 0) return null;

  return (
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
      {prices.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <Icon size={12} className="text-gold-600" />
              {item.label}
            </div>
            <p className="mt-1 text-sm font-black text-emerald-950">{formatPrice(item.value)}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function PublicPackageCard({ p, onNavigate, dark = false, compact = false }: PublicPackageCardProps) {
  const pkgUrl = packageShareUrl(p.id);
  const hasBasicDetails = p.duration_days || p.hotel || p.hotel_makkah || p.hotel_madinah || p.airline;

  if (compact) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-lg transition-all flex">
        <div className="w-32 flex-shrink-0 overflow-hidden bg-emerald-100">
          <img src={p.image_url || fallbackImage} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="p-4 flex-1 min-w-0">
          <h3 className="font-bold text-emerald-950 text-sm mb-1 line-clamp-1">{p.name}</h3>
          {p.description && <p className="text-[11px] text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
          {p.duration_days && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3"><Clock size={12} className="text-gold-600" /> {p.duration_days} يوم</div>}
          <PriceGrid p={p} compact />
          <button onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })} className="mt-3 bg-gradient-gold text-emerald-950 font-bold text-[11px] px-3 py-1.5 rounded-lg hover:shadow-md transition-all">احجز</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group rounded-3xl overflow-hidden shadow-lg transition-all hover:scale-[1.02] ${dark ? 'bg-white' : 'public-card'}`}>
      <div className="relative h-52 overflow-hidden">
        <img src={p.image_url || fallbackImage} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        {p.featured && <span className="absolute top-3 right-3 bg-gradient-gold text-emerald-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Star size={10} fill="currentColor" /> مميزة</span>}
        <div className="absolute top-3 left-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ShareButton title={p.name} compact shareUrl={pkgUrl} />
          <CopyPackageLink url={pkgUrl} compact />
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-black text-emerald-950 text-lg mb-3">{p.name}</h3>
        {p.description && <p className="text-gray-500 text-xs mb-4 line-clamp-2">{p.description}</p>}

        {hasBasicDetails && (
          <div className="space-y-2 text-xs text-gray-600 mb-4">
            {p.duration_days && <div className="flex items-center gap-2"><Clock size={13} className="text-gold-600" /> {p.duration_days} يوم</div>}
            {p.hotel && <div className="flex items-center gap-2"><Hotel size={13} className="text-gold-600" /> {p.hotel}</div>}
            {p.hotel_makkah && <div className="flex items-center gap-2"><Hotel size={13} className="text-gold-600" /> مكة: {p.hotel_makkah}</div>}
            {p.hotel_madinah && <div className="flex items-center gap-2"><Hotel size={13} className="text-gold-600" /> المدينة: {p.hotel_madinah}</div>}
            {p.airline && <div className="flex items-center gap-2"><Plane size={13} className="text-gold-600" /> {p.airline}</div>}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-black text-emerald-950 mb-3">الأسعار المتاحة</p>
          <PriceGrid p={p} />
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => onNavigate('package-details', undefined, p.id)} className="flex-1 bg-emerald-950 text-white font-bold text-xs px-3 py-2.5 rounded-xl hover:bg-emerald-900 transition-all">عرض التفاصيل</button>
          <button onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })} className="flex-1 bg-gradient-gold text-emerald-950 font-bold text-xs px-3 py-2.5 rounded-xl hover:shadow-lg transition-all">احجز الآن</button>
        </div>
        <CopyPackageLink url={pkgUrl} />
      </div>
    </div>
  );
}
