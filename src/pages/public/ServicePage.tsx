import { useEffect, useState } from 'react';
import { Plane, Star, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import PublicPackageCard from '../../components/public/PublicPackageCard';

interface Props {
  type: 'حج' | 'عمرة';
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const heroByType = {
  'حج': { img: 'https://images.pexels.com/photos/35332386/pexels-photo-35332386.jpeg?auto=compress&cs=tinysrgb&w=1920', title: 'برامج الحج المتكاملة', subtitle: 'فريضة العمر بأيدٍ أمينة، إقامة مريحة وإشراف متخصص' },
  'عمرة': { img: 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1920', title: 'برامج العمرة على مدار العام', subtitle: 'عمرة مريحة بأفضل الفنادق وأقربها للحرم الشريف' },
};

export default function ServicePage({ type, onNavigate }: Props) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const hero = heroByType[type];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('packages').select('*').eq('is_active', true).eq('type', type).order('created_at', { ascending: false });
      setPackages((data as Package[]) || []);
      setLoading(false);
    })();
  }, [type]);

  const features = type === 'حج' ? ['إقامة قرب المشاعر المقدسة', 'مرشد ديني متخصص', 'نقل مكيف بين المشاعر', 'وجبات إفطار وسحور'] : ['فنادق قريبة من الحرم', 'تأشيرة عمرة معتمدة', 'تذاكر طيران ذهاب وعودة', 'نقل من وإلى المطار'];

  return (
    <div>
      <section className="relative min-h-[420px] overflow-hidden">
        <img src={hero.img} alt={hero.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 public-hero-overlay" />
        <div className="relative max-w-7xl mx-auto px-4 py-28 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"><MapPin size={12} /> {type === 'حج' ? 'مكة المكرمة والمشاعر' : 'مكة المكرمة والمدينة'}</span>
          <h1 className="text-3xl md:text-5xl font-black mb-3">{hero.title}</h1>
          <p className="text-white/80 text-lg max-w-2xl">{hero.subtitle}</p>
        </div>
      </section>

      <section className="bg-emerald-50 py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-emerald-950"><div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center text-emerald-950 flex-shrink-0"><Star size={14} fill="currentColor" /></div><span className="text-xs font-semibold">{f}</span></div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div><h2 className="text-2xl md:text-3xl font-black text-emerald-950">باقات {type} المتاحة</h2><p className="text-gray-500 text-sm mt-1">اختر الباقة المناسبة لك وابدأ رحلتك المباركة</p></div>
            <button onClick={() => onNavigate('offers')} className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">عرض العروض <ArrowLeft size={14} /></button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-gold-600" /></div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><Plane size={48} className="mx-auto mb-3 opacity-30" /><p className="font-medium">لا توجد باقات متاحة حالياً</p><p className="text-sm mt-1">سيتم إضافتها قريباً بإذن الله</p></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
