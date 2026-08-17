import { useEffect, useState } from 'react';
import { Star, MapPin, CheckCircle2, Loader2, Hotel as HotelIcon, ArrowRight, Clock, Plane, Bed } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Hotel, Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';

interface Props {
  hotelId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function HotelDetailsPage({ hotelId, onNavigate }: Props) {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [similar, setSimilar] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('hotels').select('*').eq('id', hotelId).maybeSingle();
      if (data) {
        setHotel(data as Hotel);
        const { data: pkData } = await supabase.from('package_hotels').select('packages(*)').eq('hotel_id', hotelId);
        const linked = (pkData as { packages: Package }[] | null)?.map((r) => r.packages).filter((p): p is Package => !!p && p.is_active) || [];
        setPackages(linked);
        if ((data as Hotel).city) {
          const { data: sim } = await supabase.from('hotels').select('*').eq('status', 'نشط').eq('city', (data as Hotel).city).neq('id', hotelId).limit(3);
          setSimilar((sim as Hotel[]) || []);
        }
      }
      setLoading(false);
    })();
  }, [hotelId]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="animate-spin text-gold-600" /></div>;
  if (!hotel) return <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-400 px-4"><HotelIcon size={56} className="mb-4 opacity-30" /><p className="font-bold text-lg">الفندق غير متاح</p><button onClick={() => onNavigate('hotels')} className="mt-4 text-gold-600 font-bold text-sm">العودة للفنادق</button></div>;

  const images = hotel.images?.length ? hotel.images : ['https://images.pexels.com/photos/2029722/pexels-photo-2029722.jpeg?auto=compress&cs=tinysrgb&w=1200'];

  return (
    <div className="bg-[#fbfaf7]">
      <div className="bg-emerald-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-gray-500">
          <button onClick={() => onNavigate('home')} className="hover:text-gold-600">الرئيسية</button><ArrowRight size={12} className="opacity-50" />
          <button onClick={() => onNavigate('hotels')} className="hover:text-gold-600">الفنادق</button><ArrowRight size={12} className="opacity-50" />
          <span className="text-emerald-950 font-semibold">{hotel.name}</span>
        </div>
      </div>

      {/* Gallery */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          <div className="relative h-[300px] md:h-[440px] rounded-2xl overflow-hidden bg-emerald-100">
            <img src={images[activeImg]} alt={hotel.name} className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">{Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={14} className="text-gold-500" fill="currentColor" />)}<span className="text-xs font-bold text-emerald-950 mr-1">{hotel.stars} نجوم</span></div>
            {hotel.category === 'VIP' && <span className="absolute top-4 left-4 bg-gradient-gold text-emerald-950 text-sm font-black px-3 py-1.5 rounded-full shadow-lg">VIP</span>}
          </div>
          {images.length > 1 && (
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:max-h-[440px]">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`flex-shrink-0 w-24 h-20 lg:w-full lg:h-24 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? 'border-gold-500 scale-95' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={img} alt={`${hotel.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-emerald-950 mb-3">{hotel.name}</h1>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4"><MapPin size={16} className="text-gold-600" />{hotel.city}، {hotel.country}{hotel.address && <span className="text-gray-400">— {hotel.address}</span>}</div>
              {hotel.description && <p className="text-gray-600 leading-relaxed text-sm">{hotel.description}</p>}
            </div>

            {hotel.services?.length > 0 && (
              <div>
                <h2 className="text-lg font-black text-emerald-950 mb-4">الخدمات والمرافق</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {hotel.services.map((s) => <div key={s} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-gray-100"><CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /><span className="text-sm font-semibold text-emerald-950">{s}</span></div>)}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-black text-emerald-950 mb-4">أنواع الغرف وأسعارها</h2>
              <div className="space-y-3">
                {[['غرفة فردية', Math.round(Number(hotel.price_per_night) * 1)], ['غرفة مزدوجة', Math.round(Number(hotel.price_per_night) * 1.4)], ['غرفة عائلية', Math.round(Number(hotel.price_per_night) * 2)]].map(([type, price]) => (
                  <div key={type as string} className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 border border-gray-100">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-gold-600"><Bed size={18} /></div><span className="font-bold text-emerald-950 text-sm">{type}</span></div>
                    <p className="font-black text-emerald-950">{Number(price).toLocaleString('ar-EG')} <span className="text-xs font-medium">ج.م / ليلة</span></p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-black text-emerald-950 mb-4">معلومات الإقامة</h2>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 text-sm text-gray-600 space-y-2">
                <p>تاريخ الوصول: من الساعة 2:00 ظهراً</p>
                <p>تاريخ المغادرة: حتى الساعة 12:00 ظهراً</p>
                <p>الإفطار مشمول حسب الباقة المختارة</p>
              </div>
            </div>

            {packages.length > 0 && (
              <div>
                <h2 className="text-lg font-black text-emerald-950 mb-4">الباقات المرتبطة بهذا الفندق</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {packages.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-lg transition-all flex">
                      <div className="w-28 flex-shrink-0 overflow-hidden bg-emerald-100">{p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-emerald"><Plane size={20} className="text-gold-400/50" /></div>}</div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-emerald-950 text-sm mb-1 line-clamp-1">{p.name}</h3>
                        {p.duration_days && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2"><Clock size={12} className="text-gold-600" /> {p.duration_days} يوم</div>}
                        <div className="mt-auto flex items-center justify-between"><p className="font-black text-emerald-950 text-sm">{Number(p.price).toLocaleString('ar-EG')}<span className="text-[10px] font-medium mr-1">ج.م</span></p><button onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })} className="bg-gradient-gold text-emerald-950 font-bold text-[11px] px-3 py-1.5 rounded-lg hover:shadow-md transition-all">احجز</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div className="lg:sticky lg:top-28 h-fit">
            <div className="bg-emerald-950 rounded-2xl shadow-lg p-6 text-white">
              <div className="text-center pb-5 border-b border-white/10">
                <p className="text-xs text-white/60 mb-1">السعر يبدأ من / لليلة</p>
                <p className="text-3xl font-black text-gold-300">{Number(hotel.price_per_night).toLocaleString('ar-EG')}<span className="text-sm font-medium mr-1.5">ج.م</span></p>
                <div className="flex items-center justify-center gap-1 mt-2">{Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} size={14} className="text-gold-500" fill="currentColor" />)}<span className="text-xs text-white/60 mr-1">{hotel.category}</span></div>
              </div>
              <div className="space-y-3 py-5 text-sm">
                <div className="flex items-center justify-between"><span className="text-white/60">المدينة</span><span className="font-bold">{hotel.city}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/60">الدولة</span><span className="font-bold">{hotel.country}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/60">التصنيف</span><span className="font-bold">{hotel.category}</span></div>
              </div>
              <button onClick={() => onNavigate('booking', { type: 'فندق' })} className="w-full bg-gradient-gold text-emerald-950 font-black py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">احجز الآن</button>
              <button onClick={() => onNavigate('hotels')} className="w-full mt-2 text-white/80 hover:text-gold-300 font-bold text-sm py-2 transition-colors">العودة للفنادق</button>
              <div className="border-t border-white/10 mt-5 pt-4"><p className="text-white/60 text-xs mb-3">شارك هذا الفندق</p><ShareButton title={hotel.name} label="مشاركة" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar hotels */}
      {similar.length > 0 && (
        <section className="py-16 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-black text-emerald-950 mb-8">فنادق مشابهة</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similar.map((h) => (
                <div key={h.id} onClick={() => onNavigate('hotel-details', undefined, h.id)} className="public-card overflow-hidden cursor-pointer group">
                  <div className="relative h-40 overflow-hidden bg-emerald-100">
                    {h.images?.[0] ? <img src={h.images[0]} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-emerald"><HotelIcon size={36} className="text-gold-400/40" /></div>}
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} size={10} className="text-gold-500" fill="currentColor" />)}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-emerald-950 text-sm mb-1 line-clamp-1">{h.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3"><MapPin size={12} className="text-gold-600" /> {h.city}، {h.country}</div>
                    <p className="font-black text-emerald-950 text-sm">{Number(h.price_per_night).toLocaleString('ar-EG')} <span className="text-[10px]">ج.م / ليلة</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
