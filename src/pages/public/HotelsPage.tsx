import { useEffect, useMemo, useState } from 'react';
import { Search, Hotel as HotelIcon, SlidersHorizontal, X, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import { Empty, Loading, PageHero } from '../../components/public/site/sections';
import { HotelCard } from '../../components/public/site/cards';

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
      <PageHero
        eyebrow="فنادق 4 و5 نجوم"
        title={<>فنادق <em>مكة والمدينة</em></>}
        lead="حجز فنادق قريبة من الحرمين بأسعار مباشرة، للأفراد والعائلات والمجموعات."
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'الفنادق' }]}
        onNavigate={onNavigate}
      />

      {/* Search bar */}
      <div className="sticky z-30 bg-white/95 backdrop-blur border-b border-pm-line" style={{ top: 'var(--nav-h)' }}>
        <div className="pm-wrap py-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <select aria-label="المدينة" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="pm-input">
              <option value="">المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative col-span-2">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-pm-muted pointer-events-none" />
              <input aria-label="اسم الفندق" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم الفندق" className="pm-input" style={{ paddingLeft: 38 }} />
            </div>
            <input aria-label="تاريخ الوصول" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} dir="ltr" className="pm-input" />
            <input aria-label="تاريخ المغادرة" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} dir="ltr" className="pm-input" />
            <div className="relative">
              <Users size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-pm-muted pointer-events-none" />
              <input aria-label="عدد الأفراد" type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} className="pm-input" style={{ paddingLeft: 38 }} placeholder="1" dir="ltr" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button type="button" onClick={() => setShowFilters(!showFilters)} className={`pm-btn pm-btn-sm ${activeFilters > 0 ? 'pm-btn-teal' : 'pm-btn-ghost'}`} aria-expanded={showFilters}>
              <SlidersHorizontal size={15} /> فلترة متقدمة
              {activeFilters > 0 && <span className="pm-pill gold" style={{ padding: '0 7px', fontSize: 11 }}>{activeFilters}</span>}
            </button>
            {(activeFilters > 0 || search) && <button type="button" onClick={clearFilters} className="pm-link" style={{ fontSize: 14 }}><X size={14} /> مسح الفلاتر</button>}
          </div>
          {showFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
              <select aria-label="عدد النجوم" value={starsFilter} onChange={(e) => setStarsFilter(e.target.value)} className="pm-input"><option value="">عدد النجوم</option><option value="5">5 نجوم</option><option value="4">4 نجوم</option><option value="3">3 نجوم</option></select>
              <select aria-label="نوع الغرفة" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="pm-input"><option value="">نوع الغرفة</option>{roomTypes.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <select aria-label="الخدمات" value={amenityFilter} onChange={(e) => setAmenityFilter(e.target.value)} className="pm-input"><option value="">الخدمات والمميزات</option>{(amenities.length ? amenities : amenityOptions).map((a) => <option key={a} value={a}>{a}</option>)}</select>
            </div>
          )}
        </div>
      </div>

      <section className="pm-section tight" style={{ minHeight: '40vh' }}>
        <div className="pm-wrap">
          {!loading && <p className="pm-display text-pm-teal text-xl font-semibold mb-6">{filtered.length} فندق متاح</p>}
          {loading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <Empty icon={<HotelIcon size={44} />} title="لا توجد فنادق مطابقة" text="جرّب تعديل الفلاتر أو امسحها لعرض الكل." />
          ) : (
            <div className="pm-grid-3">
              {filtered.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} onNavigate={onNavigate} full />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
