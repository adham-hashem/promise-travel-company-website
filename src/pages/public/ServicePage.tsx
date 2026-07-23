import { useEffect, useState } from 'react';
import { Clock, Hotel, Plane, Star, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  type: 'حج' | 'عمرة';
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

const heroByType = {
  'حج': {
    img: 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=1920',
    title: 'برامج الحج المتكاملة',
    subtitle: 'فريضة العمر بأيدٍ أمينة، إقامة مريحة وإشراف متخصص',
  },
  'عمرة': {
    img: 'https://images.pexels.com/photos/934879/pexels-photo-934879.jpeg?auto=compress&cs=tinysrgb&w=1920',
    title: 'برامج العمرة على مدار العام',
    subtitle: 'عمرة مريحة بأفضل الفنادق وأقربها للحرم الشريف',
  },
};

export default function ServicePage({ type, onNavigate }: Props) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const hero = heroByType[type];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .eq('type', type)
        .order('created_at', { ascending: false });
      setPackages((data as Package[]) || []);
      setLoading(false);
    })();
  }, [type]);

  const features =
    type === 'حج'
      ? ['إقامة قرب المشاعر المقدسة', 'مرشد ديني متخصص', 'نقل مكيف بين المشاعر', 'وجبات إفطار وسحور']
      : ['فنادق قريبة من الحرم', 'تأشيرة عمرة معتمدة', 'تذاكر طيران ذهاب وعودة', 'نقل من وإلى المطار'];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <img src={hero.img} alt={hero.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/70 to-navy-900/30" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-16 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
            <MapPin size={12} /> {type === 'حج' ? 'مكة المكرمة والمشاعر' : 'مكة المكرمة والمدينة'}
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">{hero.title}</h1>
          <p className="text-white/80 text-lg max-w-2xl">{hero.subtitle}</p>
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-navy-50 py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-navy-800">
              <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center text-navy-900 flex-shrink-0">
                <Star size={14} fill="currentColor" />
              </div>
              <span className="text-xs font-semibold">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-navy-900">باقات {type} المتاحة</h2>
              <p className="text-gray-500 text-sm mt-1">اختر الباقة المناسبة لك وابدأ رحلتك المباركة</p>
            </div>
            <button
              onClick={() => onNavigate('offers')}
              className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
            >
              عرض العروض <ArrowLeft size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Plane size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد باقات متاحة حالياً</p>
              <p className="text-sm mt-1"> سيتم إضافته قريباً بإذن الله</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="relative h-52 overflow-hidden">
                    <img src={p.image_url || 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    {p.featured && (
                      <span className="absolute top-3 right-3 bg-gradient-gold text-navy-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> مميزة
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-navy-900 text-lg mb-3">{p.name}</h3>
                    {p.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{p.description}</p>}
                    <div className="space-y-2 text-xs text-gray-600 mb-4">
                      {p.duration_days && <div className="flex items-center gap-2"><Clock size={13} className="text-gold-600" /> {p.duration_days} يوم</div>}
                      {p.hotel && <div className="flex items-center gap-2"><Hotel size={13} className="text-gold-600" /> {p.hotel}</div>}
                      {p.airline && <div className="flex items-center gap-2"><Plane size={13} className="text-gold-600" /> {p.airline}</div>}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400">يبدأ من</p>
                        <p className="font-black text-navy-900 text-lg">{Number(p.price).toLocaleString('ar-EG')} <span className="text-xs font-medium">ج.م</span></p>
                      </div>
                      <button
                        onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })}
                        className="bg-gradient-gold text-navy-900 font-bold text-xs px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                      >
                        احجز الآن
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
