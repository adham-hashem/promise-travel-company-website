import { useEffect, useState } from 'react';
import { MapPin, Hotel, Users, Loader2, Plane, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InternalTrip } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

export default function InternalPage({ onNavigate }: Props) {
  const [trips, setTrips] = useState<InternalTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('internal_trips')
        .select('*')
        .eq('status', 'متاحة')
        .order('start_date', { ascending: true });
      setTrips((data as InternalTrip[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[400px] overflow-hidden">
        <img src="https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="الرحلات الداخلية" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/70 to-navy-900/30" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-16 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
            <Plane size={12} /> سياحة داخلية
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">الرحلات الداخلية</h1>
          <p className="text-white/80 text-lg max-w-2xl">اكتشف جمال مصر — شرم الشيخ، الغردقة، الأقصر وأسوان برامج سياحية متكاملة</p>
        </div>
      </section>

      {/* Trips grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-navy-900 mb-8">الرحلات المتاحة</h2>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Plane size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد رحلات متاحة حالياً</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((t) => {
                const seatPct = t.total_seats > 0 ? Math.round((t.available_seats / t.total_seats) * 100) : 0;
                return (
                  <div key={t.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="relative h-52 overflow-hidden bg-gradient-navy flex items-center justify-center">
                      <MapPin size={56} className="text-gold-400/40" />
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-navy-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <MapPin size={11} /> {t.destination}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-navy-900 text-lg mb-1">{t.name}</h3>
                      {t.duration && <p className="text-gray-400 text-xs mb-3">{t.duration}</p>}
                      <div className="space-y-2 text-xs text-gray-600 mb-4">
                        {t.hotel && <div className="flex items-center gap-2"><Hotel size={13} className="text-gold-600" /> {t.hotel}</div>}
                        <div className="flex items-center gap-2"><Calendar size={13} className="text-gold-600" /> {new Date(t.start_date).toLocaleDateString('ar-EG')} ← {new Date(t.end_date).toLocaleDateString('ar-EG')}</div>
                        <div className="flex items-center gap-2"><Users size={13} className="text-gold-600" /> مقاعد متاحة: {t.available_seats} / {t.total_seats}</div>
                      </div>
                      <div className="mb-3">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${seatPct > 50 ? 'bg-emerald-500' : seatPct > 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${seatPct}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-400">السعر للفرد</p>
                          <p className="font-black text-navy-900 text-lg">{Number(t.price).toLocaleString('ar-EG')} <span className="text-xs font-medium">ج.م</span></p>
                        </div>
                        <button
                          onClick={() => onNavigate('booking', { type: 'داخلي' })}
                          className="bg-gradient-gold text-navy-900 font-bold text-xs px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                        >
                          احجز الآن
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
