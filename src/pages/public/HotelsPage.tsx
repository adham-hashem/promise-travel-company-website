import { useEffect, useMemo, useState } from 'react';
import { Star, MapPin, Search, Loader2, Hotel as HotelIcon, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

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
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/70 to-navy-900/20" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-16 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
            <HotelIcon size={12} /> إقامة فاخرة
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">الفنادق</h1>
          <p className="text-white/80 text-lg max-w-2xl">اختر من نخبة الفنادق المصنّفة قرب الحرم الشريف وأجمل الوجهات السياحية</p>
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
      <section className="py-12 bg-gray-50 min-h-[40vh]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-navy-900">
              {filtered.length} فندق متاح
            </h2>
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((hotel) => (
                <div
                  key={hotel.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-52 overflow-hidden bg-navy-100">
                    {hotel.images?.[0] ? (
                      <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-navy">
                        <HotelIcon size={48} className="text-gold-400/40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} size={11} className="text-gold-500" fill="currentColor" />
                      ))}
                    </div>
                    {hotel.category === 'VIP' && (
                      <span className="absolute top-3 left-3 bg-gradient-gold text-navy-900 text-xs font-black px-2.5 py-1 rounded-full shadow-md">VIP</span>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-black text-navy-900 text-lg mb-2">{hotel.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin size={13} className="text-gold-600" />
                      {hotel.city}، {hotel.country}
                    </div>

                    {hotel.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {hotel.services.slice(0, 4).map((s) => (
                          <span key={s} className="bg-navy-50 text-navy-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">{s}</span>
                        ))}
                        {hotel.services.length > 4 && (
                          <span className="text-[10px] text-gray-400 font-medium py-0.5">+{hotel.services.length - 4}</span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400">يبدأ من / لليلة</p>
                        <p className="font-black text-navy-900 text-lg">
                          {Number(hotel.price_per_night).toLocaleString('ar-EG')}
                          <span className="text-xs font-medium mr-1">ج.م</span>
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigate('hotel-details', undefined, hotel.id)}
                        className="bg-navy-800 hover:bg-navy-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:shadow-lg"
                      >
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
