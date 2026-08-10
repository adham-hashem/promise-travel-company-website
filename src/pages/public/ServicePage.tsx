import { useEffect, useState } from 'react';
import { Clock, Hotel, Plane, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  type?: 'حج' | 'عمرة';
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const heroByType = {
  حج: {
    img: '/صفحة الحج .webp',
    title: 'باقات الحج',
    subtitle: 'اختر الباقة المناسبة لك وابدأ رحلتك المباركة.',
  },
  عمرة: {
    img: '/صفحة العمرة.webp',
    title: 'باقات العمرة',
    subtitle: 'اختر الباقة المناسبة لك وابدأ رحلتك المباركة.',
  },
};

export default function ServicePage({ type, onNavigate }: Props) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpandedPackages(prev => ({ ...prev, [id]: !prev[id] }));
  const [loading, setLoading] = useState(true);
  const hero = heroByType[type || 'حج'];

  useEffect(() => {
    (async () => {
      const query = supabase.from('packages').select('*').eq('is_active', true).order('created_at', { ascending: false });

      const { data } = type ? await query.eq('type', type) : await query.in('type', ['حج', 'عمرة']);

      setPackages((data as Package[]) || []);
      setLoading(false);
    })();
  }, [type]);

  const visiblePackages = packages;

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <img src={hero.img} alt={hero.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-16 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-white/20 backdrop-blur border border-white/30 text-white px-4 py-1.5 rounded-full text-xs font-semibold mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <MapPin size={12} /> {type === 'حج' ? 'مكة المكرمة والمشاعر' : 'مكة المكرمة والمدينة'}
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-3 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">{hero.title}</h1>
          <p className="text-white text-lg max-w-2xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">{hero.subtitle}</p>
        </div>
      </section>

      <section className="bg-[#F8F9FB] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-[#0B1F44]">{hero.title}</h2>
              <p className="mt-1 text-sm text-[#0B1F44]/60">{hero.subtitle}</p>
            </div>
            <button
              onClick={() => onNavigate('offers')}
              className="flex items-center gap-1 text-sm font-bold text-[#D4A017] transition-all hover:gap-2"
            >
              عرض العروض <ArrowLeft size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#0B1F44]" /></div>
          ) : visiblePackages.length === 0 ? (
            <div className="rounded-[24px] border border-[#0B1F44]/10 bg-white py-16 text-center shadow-[0_20px_60px_-22px_rgba(11,31,68,0.18)]">
              <Plane size={48} className="mx-auto mb-3 opacity-30 text-[#0B1F44]" />
              <p className="font-medium text-[#0B1F44]">لا توجد باقات متاحة حالياً</p>
              <p className="mt-1 text-sm text-[#0B1F44]/60">سيتم إضافتها قريباً بإذن الله</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {visiblePackages.map((p) => (
                <article
                  key={p.id}
                  className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#0B1F44]/10 bg-white shadow-[0_16px_45px_-22px_rgba(11,31,68,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_-20px_rgba(11,31,68,0.35)]"
                >
                  <div className="relative h-[220px] overflow-hidden">
                    <img
                      src={p.image_url || 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=800'}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F44]/90 via-[#0B1F44]/15 to-transparent" />
                    {p.featured ? (
                      <span className="absolute right-3 top-3 rounded-full bg-[#D4A017] px-2.5 py-1 text-[10px] font-black text-[#0B1F44] shadow-lg">
                        مميزة
                      </span>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="text-lg font-black text-white">{p.name}</h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                     {p.description ? (
                      <div className="text-right mb-3">
                        <p className="text-sm leading-relaxed text-[#0B1F44]/60">
                          {p.description.length > 80
                            ? p.description.slice(0, 80) + '...'
                            : p.description}
                        </p>
                        <div className="flex justify-center mt-3">
                          <button
                            type="button"
                            onClick={() => onNavigate('package-details', undefined, p.id)}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#D4A017] bg-[#D4A017]/15 hover:bg-[#D4A017]/25 px-5 py-2 rounded-full transition-all focus:outline-none border border-[#D4A017]/30 shadow-md hover:scale-105 active:scale-95"
                          >
                            ▼ عرض المزيد
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2.5 text-sm text-[#0B1F44]/70">
                      {p.duration_days ? (
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-[#D4A017]" />
                          <span>{p.duration_days} يوم</span>
                        </div>
                      ) : null}
                      {p.hotel_makkah ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#D4A017] text-xs">🕋</span>
                          <span>فندق مكة: {p.hotel_makkah}</span>
                        </div>
                      ) : null}
                      {p.hotel_madinah ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#D4A017] text-xs">🕌</span>
                          <span>فندق المدينة: {p.hotel_madinah}</span>
                        </div>
                      ) : null}
                      {!p.hotel_makkah && !p.hotel_madinah && p.hotel ? (
                        <div className="flex items-center gap-2">
                          <Hotel size={13} className="text-[#D4A017]" />
                          <span>{p.hotel}</span>
                        </div>
                      ) : null}
                      {p.airline ? (
                        <div className="flex items-center gap-2">
                          <Plane size={13} className="text-[#D4A017]" />
                          <span>{p.airline}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-[16px] border border-[#0B1F44]/10 bg-[#F8F9FB] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0B1F44]/45">ابتداءً من</p>
                      <p className="mt-1 text-xl font-black text-[#D4A017]">
                        {Number((() => {
                          if (Number(p.price) > 0) return Number(p.price);
                          const roomPrices = [p.price_double, p.price_triple, p.price_quad].filter(x => Number(x) > 0);
                          return roomPrices.length > 0 ? Math.min(...roomPrices) : 0;
                        })()).toLocaleString('ar-EG')}
                        <span className="ml-1 text-sm font-semibold text-[#0B1F44]/75">ج.م</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })}
                      className="mt-4 w-full rounded-full bg-[#D4A017] px-3 py-2.5 text-sm font-black text-[#0B1F44] shadow-[0_10px_25px_-12px_rgba(212,160,23,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C08F0F]"
                    >
                      احجز الآن
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
