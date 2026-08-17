import { useEffect, useMemo, useState } from 'react';
import { Star, MapPin, Search, Loader2, Hotel as HotelIcon, SlidersHorizontal, X, Calendar, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const roomTypes = ['فردي', 'مزدوج', 'ثلاثي', 'عائلي'];
const amenityOptions = ['واي فاي', 'مسبح', 'مطعم', 'مواقف', 'جيم', 'سبا'];

export default function HotelsPage({ onNavigate }: Props) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [starsFilter, setStarsFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [amenityFilter, setAmenityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('hotels').select('*').eq('status', 'نشط').order('stars', { ascending: false }).order('created_at', { ascending: false });
      setHotels((data as Hotel[]) || []);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => [...new Set(hotels.map((h) => h.city).filter(Boolean))].sort(), [hotels]);
  const amenities = useMemo(() => [...new Set(hotels.flatMap((h) => h.services || []).filter(Boolean))].sort(), [hotels]);

  const filtered = hotels.filter((h) => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && h.city !== cityFilter) return false;
    if (starsFilter && h.stars !== Number(starsFilter)) return false;
    if (amenityFilter && !(h.services || []).includes(amenityFilter)) return false;
    return true;
  });

  const activeFilters = (cityFilter ? 1 : 0) + (starsFilter ? 1 : 0) + (roomFilter ? 1 : 0) + (amenityFilter ? 1 : 0);
  const clearFilters = () => { setCityFilter(''); setStarsFilter(''); setRoomFilter(''); setAmenityFilter(''); setSearch(''); };

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[340px] overflow-hidden bg-gradient-emerald">
        <img src="https://images.pexels.com/photos/2029722/pexels-photo-2029722.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="الفنادق" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 to-emerald-950/20" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-white">
          <span className="inline-flex items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"><HotelIcon size={12} /> إقامة فاخرة</span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">فنادقنا</h1>
          <p className="text-white/80 text-lg max-w-2xl">اختر إقامتك المثالية واستمتع بتجربة مريحة ومميزة مع PROMISE.</p>
        </div>
      </section>

      {/* Search Bar */}
      <section className="sticky top-20 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="public-input">
              <option value="">المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative col-span-2">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم الفندق" className="public-input pr-9" />
            </div>
            <div className="relative"><Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" /><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} dir="ltr" className="public-input pr-9" /></div>
            <div className="relative"><Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" /><input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} dir="ltr" className="public-input pr-9" /></div>
            <div className="relative"><Users size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" /><input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} className="public-input pr-9" placeholder="الأشخاص" /></div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilters > 0 ? 'bg-emerald-950 text-white' : 'bg-gray-100 text-emerald-950 hover:bg-gray-200'}`}>
              <SlidersHorizontal size={16} /> فلترة متقدمة
              {activeFilters > 0 && <span className="bg-gold-500 text-emerald-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFilters}</span>}
            </button>
            {activeFilters > 0 && <button onClick={clearFilters} className="text-red-500 hover:text-red-600 text-sm font-bold flex items-center gap-1"><X size={14} /> مسح الفلاتر</button>}
          </div>
          {showFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 animate-fadeIn">
              <select value={starsFilter} onChange={(e) => setStarsFilter(e.target.value)} className="public-input"><option value="">عدد النجوم</option><option value="5">5 نجوم</option><option value="4">4 نجوم</option><option value="3">3 نجوم</option></select>
              <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="public-input"><option value="">نوع الغرفة</option>{roomTypes.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <select value={amenityFilter} onChange={(e) => setAmenityFilter(e.target.value)} className="public-input"><option value="">الخدمات والمميزات</option>{(amenities.length ? amenities : amenityOptions).map((a) => <option key={a} value={a}>{a}</option>)}</select>
              <button onClick={clearFilters} className="public-input text-red-500 font-bold flex items-center justify-center gap-1"><X size={14} /> إعادة تعيين</button>
            </div>
          )}
        </div>
      </section>

      {/* Hotels grid */}
      <section className="py-12 bg-[#fbfaf7] min-h-[40vh]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl font-black text-emerald-950 mb-6">{filtered.length} فندق متاح</h2>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-gold-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><HotelIcon size={48} className="mx-auto mb-3 opacity-30" /><p className="font-medium">لا توجد فنادق مطابقة</p><p className="text-sm mt-1">جرّب تعديل الفلاتر أو امسحها لعرض الكل</p></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((hotel) => (
                <div key={hotel.id} className="public-card overflow-hidden flex flex-col">
                  <div className="relative h-52 overflow-hidden bg-emerald-100">
                    {hotel.images?.[0] ? <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-emerald"><HotelIcon size={48} className="text-gold-400/40" /></div>}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">{Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={11} className="text-gold-500" fill="currentColor" />)}</div>
                    <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}><ShareButton title={hotel.name} compact /></div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-black text-emerald-950 text-lg mb-2">{hotel.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3"><MapPin size={13} className="text-gold-600" />{hotel.city}، {hotel.country}</div>
                    {hotel.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {hotel.services.slice(0, 4).map((s) => <span key={s} className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">{s}</span>)}
                        {hotel.services.length > 4 && <span className="text-[10px] text-gray-400 font-medium py-0.5">+{hotel.services.length - 4}</span>}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                      <div><p className="text-[10px] text-gray-400">يبدأ من / لليلة</p><p className="font-black text-emerald-950 text-lg">{Number(hotel.price_per_night).toLocaleString('ar-EG')}<span className="text-xs font-medium mr-1">ج.م</span></p></div>
                      <div className="flex gap-2">
                        <button onClick={() => onNavigate('hotel-details', undefined, hotel.id)} className="bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all">عرض التفاصيل</button>
                        <button onClick={() => onNavigate('booking', { type: 'فندق' })} className="bg-gradient-gold text-emerald-950 font-bold text-xs px-4 py-2.5 rounded-xl hover:shadow-lg transition-all">احجز الآن</button>
                      </div>
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
