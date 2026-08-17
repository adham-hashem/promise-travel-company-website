import { useEffect, useState } from 'react';
import { Tag, Loader2, Clock, ArrowLeft, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Offer, Package, OfferType } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

type Tab = 'all' | 'hajj-umrah' | 'travel' | 'hotels' | 'special';

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'hajj-umrah', label: 'حج وعمرة' },
  { id: 'travel', label: 'رحلات سياحية' },
  { id: 'hotels', label: 'فنادق' },
  { id: 'special', label: 'عروض خاصة' },
];

const typeLabels: Record<OfferType, string> = { 'حج': 'حج', 'عمرة': 'عمرة', 'داخلي': 'رحلات داخلية' };

function matchesTab(o: Offer & { packages?: Package }, tab: Tab): boolean {
  if (tab === 'all') return true;
  const t = o.type || o.packages?.type;
  if (tab === 'hajj-umrah') return t === 'حج' || t === 'عمرة';
  if (tab === 'travel') return t === 'داخلي';
  if (tab === 'hotels') return !!o.packages?.hotel && (t !== 'حج' && t !== 'عمرة');
  if (tab === 'special') return o.discount_percentage >= 20;
  return true;
}

export default function OffersPage({ onNavigate }: Props) {
  const [offers, setOffers] = useState<(Offer & { packages?: Package })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('offers').select('*, packages(*)').eq('is_active', true).order('created_at', { ascending: false });
      setOffers((data as (Offer & { packages?: Package })[]) || []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const valid = offers.filter((o) => o.end_date >= today && o.start_date <= today);
  const featured = valid.filter((o) => o.discount_percentage >= 20).slice(0, 1)[0];
  const filtered = valid.filter((o) => matchesTab(o, tab));

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[380px] overflow-hidden bg-gradient-emerald">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'url(https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1920)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-emerald-950/20" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-white">
          <span className="inline-flex items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"><Tag size={12} /> عروض حصرية</span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">عروض PROMISE</h1>
          <p className="text-white/80 text-lg max-w-2xl">اكتشف أفضل العروض والبرامج السياحية المتاحة.</p>
        </div>
      </section>

      {/* Featured offer */}
      {featured && (
        <section className="py-12 bg-[#fbfaf7]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-5"><Star size={18} className="text-gold-500" fill="currentColor" /><span className="public-eyebrow">عرض مميز</span></div>
            <div className="public-card overflow-hidden grid md:grid-cols-2 cursor-pointer group" onClick={() => onNavigate('offer-details', undefined, featured.id)}>
              <div className="relative h-72 md:h-full min-h-[280px] overflow-hidden">
                <img src={featured.image_url || featured.packages?.image_url || 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1200'} alt={featured.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-5 right-5 bg-red-600 text-white font-black rounded-xl px-5 py-2.5 text-lg shadow-lg">خصم {featured.discount_percentage}%</div>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-black text-emerald-950 mb-3">{featured.name}</h2>
                {featured.description && <p className="text-gray-500 text-sm leading-relaxed mb-5">{featured.description}</p>}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5"><Clock size={13} className="text-gold-600" /> ينتهي في {new Date(featured.end_date).toLocaleDateString('ar-EG')}</div>
                <div className="flex items-end gap-4 mb-6">
                  {featured.original_price != null && <p className="text-gray-400 line-through">{Number(featured.original_price).toLocaleString('ar-EG')} ج.م</p>}
                  {featured.discounted_price != null && <p className="text-3xl font-black text-red-600">{Number(featured.discounted_price).toLocaleString('ar-EG')} ج.م</p>}
                </div>
                <button onClick={() => onNavigate('offer-details', undefined, featured.id)} className="public-btn-gold px-7 py-3.5 w-fit flex items-center gap-2">عرض التفاصيل <ArrowLeft size={16} /></button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tabs + Offers */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === t.id ? 'bg-emerald-950 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-gold-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><Tag size={48} className="mx-auto mb-3 opacity-30" /><p className="font-medium">لا توجد عروض متاحة في هذا التصنيف حالياً</p><p className="text-sm mt-1">تابعنا قريباً لعروض حصرية بإذن الله</p></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((o) => {
                const orig = o.original_price ?? o.packages?.price;
                const disc = o.discounted_price ?? (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);
                const img = o.image_url || o.packages?.image_url;
                const typeLabel = o.type ? typeLabels[o.type] : o.packages?.type;
                return (
                  <div key={o.id} className="public-card overflow-hidden relative cursor-pointer group" onClick={() => onNavigate('offer-details', undefined, o.id)}>
                    <div className="absolute top-4 right-4 z-10 bg-gradient-to-l from-red-600 to-red-500 text-white font-black px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5"><Tag size={14} />خصم {o.discount_percentage}%</div>
                    <div className="relative h-44 overflow-hidden bg-emerald-100">{img ? <img src={img} alt={o.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <Tag size={48} className="text-gold-400/40 m-auto" />}</div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">{typeLabel && <span className="badge bg-emerald-50 text-emerald-700">{typeLabel}</span>}<h3 className="font-black text-emerald-950 text-lg">{o.name}</h3></div>
                      {o.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{o.description}</p>}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4"><Clock size={12} className="text-gold-600" /> ينتهي في {new Date(o.end_date).toLocaleDateString('ar-EG')}</div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>{orig != null && <p className="text-xs text-gray-400 line-through">{Number(orig).toLocaleString('ar-EG')} ج.م</p>}{disc != null ? <p className="font-black text-red-600 text-lg">{Number(disc).toLocaleString('ar-EG')} ج.م</p> : <p className="font-black text-emerald-950 text-lg">على الباقة</p>}</div>
                        <span className="bg-gradient-gold text-emerald-950 font-bold text-xs px-4 py-2 rounded-xl">عرض التفاصيل</span>
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
