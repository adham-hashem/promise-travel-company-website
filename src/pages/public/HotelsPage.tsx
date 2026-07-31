import { useEffect, useMemo, useState } from 'react';
import { Star, MapPin, Search, Loader2, Hotel as HotelIcon, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Hotel } from '../../types';
import type { PublicPage, NavigateProps } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, hotelId?: string) => void;
}

export default function HotelsPage({ onNavigate }: Props) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [starsFilter, setStarsFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('hotels')
        .select('*')
        .eq('status', 'نشط')
        .order('stars', { ascending: false })
        .order('created_at', { ascending: false });
      setHotels((data as Hotel[]) || []);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => [...new Set(hotels.map((h) => h.city).filter(Boolean))].sort(), [hotels]);
  const countries = useMemo(() => [...new Set(hotels.map((h) => h.country).filter(Boolean))].sort(), [hotels]);

  const filtered = hotels.filter((h) => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && h.city !== cityFilter) return false;
    if (countryFilter && h.country !== countryFilter) return false;
    if (starsFilter && h.stars !== Number(starsFilter)) return false;
    return true;
  });

  const activeFilters = (cityFilter ? 1 : 0) + (countryFilter ? 1 : 0) + (starsFilter ? 1 : 0);
  const clearFilters = () => { setCityFilter(''); setCountryFilter(''); setStarsFilter(''); setSearch(''); };

  return (
    <div>
      {/* Banner */}
      <section className="relative h-[52vh] min-h-[380px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2029722/pexels-photo-2029722.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="الفنادق"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-16 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-white/20 backdrop-blur border border-white/30 text-white px-4 py-1.5 rounded-full text-xs font-semibold mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <HotelIcon size={12} /> إقامة فاخرة
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-3 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">الفنادق</h1>
          <p className="text-white text-lg max-w-2xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">اختر من نخبة الفنادق المصنّفة قرب الحرم الشريف وأجمل الوجهات السياحية</p>
        </div>
      </section>

      {/* Search + Filters bar */}
      <section className="sticky top-20 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن فندق..."
                className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeFilters > 0 ? 'bg-navy-800 text-white' : 'bg-gray-100 text-navy-800 hover:bg-gray-200'
              }`}
            >
              <SlidersHorizontal size={16} />
              فلترة
              {activeFilters > 0 && (
                <span className="bg-gold-500 text-navy-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-red-500 hover:text-red-600 text-sm font-bold flex items-center gap-1">
                <X size={14} /> مسح
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
              <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                <option value="">كل الدول</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                <option value="">كل المدن</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={starsFilter} onChange={(e) => setStarsFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                <option value="">كل النجوم</option>
                <option value="5">5 نجوم</option>
                <option value="4">4 نجوم</option>
                <option value="3">3 نجوم</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Hotels grid */}
      <section className="py-12 bg-[#F8F9FB] min-h-[40vh]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-[#0B1F44]">الفنادق المتاحة</h2>
              <p className="mt-1 text-sm text-[#0B1F44]/60">اختر إقامة فاخرة تناسب رحلتك مع أعلى معايير الراحة والرفاهية.</p>
            </div>
            <p className="text-sm font-semibold text-[#0B1F44]/60">{filtered.length} فندق متاح</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <HotelIcon size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد فنادق مطابقة</p>
              <p className="text-sm mt-1">جرّب تعديل الفلاتر أو امسحها لعرض الكل</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {filtered.map((hotel) => (
                <article
                  key={hotel.id}
                  className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#0B1F44]/10 bg-white shadow-[0_16px_45px_-22px_rgba(11,31,68,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_-20px_rgba(11,31,68,0.35)]"
                >
                  <div className="relative h-[220px] overflow-hidden bg-[#F3F4F8]">
                    {hotel.images?.[0] ? (
                      <img src={hotel.images[0]} alt={hotel.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#0B1F44]">
                        <HotelIcon size={48} className="text-[#D4A017]/40" />
                      </div>
                    )}
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} size={11} className="text-[#D4A017]" fill="currentColor" />
                      ))}
                    </div>
                    {hotel.category === 'VIP' && (
                      <span className="absolute left-3 top-3 rounded-full bg-[#D4A017] px-2.5 py-1 text-[10px] font-black text-[#0B1F44] shadow-lg">VIP</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-lg font-black text-[#0B1F44]">{hotel.name}</h3>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-[#0B1F44]/70">
                      <MapPin size={13} className="text-[#D4A017]" />
                      <span>{hotel.city}، {hotel.country}</span>
                    </div>

                    {hotel.services?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {hotel.services.slice(0, 4).map((s) => (
                          <span key={s} className="rounded-md bg-[#F8F9FB] px-2 py-0.5 text-[10px] font-semibold text-[#0B1F44]/70">{s}</span>
                        ))}
                        {hotel.services.length > 4 && (
                          <span className="py-0.5 text-[10px] font-medium text-[#0B1F44]/45">+{hotel.services.length - 4}</span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 rounded-[16px] border border-[#0B1F44]/10 bg-[#F8F9FB] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0B1F44]/45">يبدأ من / لليلة</p>
                      <p className="mt-1 text-xl font-black text-[#D4A017]">
                        {Number(hotel.price_per_night).toLocaleString('ar-EG')}
                        <span className="ml-1 text-sm font-semibold text-[#0B1F44]/75">ج.م</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('hotel-details', undefined, hotel.id)}
                      className="mt-4 w-full rounded-full bg-[#D4A017] px-3 py-2.5 text-sm font-black text-[#0B1F44] shadow-[0_10px_25px_-12px_rgba(212,160,23,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C08F0F]"
                    >
                      عرض التفاصيل
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
