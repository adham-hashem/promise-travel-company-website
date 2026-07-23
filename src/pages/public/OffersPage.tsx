import { useEffect, useState } from 'react';
import { Tag, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Offer, Package, OfferType } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

const typeLabels: Record<OfferType, string> = {
  'حج': 'حج',
  'عمرة': 'عمرة',
  'داخلي': 'رحلات داخلية',
};

export default function OffersPage({ onNavigate }: Props) {
  const [offers, setOffers] = useState<(Offer & { packages?: Package })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('offers')
        .select('*, packages(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setOffers((data as (Offer & { packages?: Package })[]) || []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const valid = offers.filter((o) => o.end_date >= today && o.start_date <= today);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[45vh] min-h-[340px] overflow-hidden bg-gradient-navy">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=1920)', backgroundSize: 'cover' }} />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-center text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
            <Tag size={12} /> عروض حصرية
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">عروض وتخفيضات مميزة</h1>
          <p className="text-white/80 text-lg max-w-2xl">استمتع بأفضل العروض على باقات الحج والعمرة والرحلات الداخلية لفترة محدودة</p>
        </div>
      </section>

      {/* Offers */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
          ) : valid.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tag size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد عروض متاحة حالياً</p>
              <p className="text-sm mt-1">تابعنا قريباً لعروض حصرية بإذن الله</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {valid.map((o) => {
                const orig = o.original_price ?? o.packages?.price;
                const disc = o.discounted_price ?? (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);
                const img = o.image_url || o.packages?.image_url;
                const typeLabel = o.type ? typeLabels[o.type] : o.packages?.type;
                return (
                  <div key={o.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all relative">
                    <div className="absolute top-4 right-4 z-10 bg-gradient-to-l from-red-600 to-red-500 text-white font-black px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5">
                      <Tag size={14} />
                      خصم {o.discount_percentage}%
                    </div>
                    <div className="relative h-44 overflow-hidden bg-gradient-navy flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={o.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Tag size={48} className="text-gold-400/40" />
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        {typeLabel && <span className="badge bg-navy-50 text-navy-700">{typeLabel}</span>}
                        <h3 className="font-black text-navy-900 text-lg">{o.name}</h3>
                      </div>
                      {o.description && <p className="text-gray-500 text-xs mb-3">{o.description}</p>}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                        <Clock size={12} className="text-gold-600" />
                        ينتهي في {new Date(o.end_date).toLocaleDateString('ar-EG')}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          {orig != null && <p className="text-xs text-gray-400 line-through">{Number(orig).toLocaleString('ar-EG')} ج.م</p>}
                          {disc != null ? (
                            <p className="font-black text-red-600 text-lg">{Number(disc).toLocaleString('ar-EG')} ج.م</p>
                          ) : (
                            <p className="font-black text-navy-900 text-lg">على الباقة</p>
                          )}
                        </div>
                        <button
                          onClick={() => onNavigate('booking', { packageId: o.packages?.id, type: o.type || o.packages?.type })}
                          className="bg-gradient-gold text-navy-900 font-bold text-xs px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                        >
                          احصل على العرض
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
