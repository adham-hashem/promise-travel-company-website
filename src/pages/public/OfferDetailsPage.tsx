import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, MessageCircle, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Offer, Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';

interface Props {
  offerId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function OfferDetailsPage({ offerId, onNavigate }: Props) {
  const [offer, setOffer] = useState<(Offer & { packages?: Package }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('offers').select('*, packages(*)').eq('id', offerId).maybeSingle().then(({ data }) => {
      setOffer(data as (Offer & { packages?: Package }) | null);
      setLoading(false);
    });
  }, [offerId]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 size={30} className="animate-spin text-gold-600" /></div>;
  if (!offer) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-gray-500"><Tag size={48} className="text-gray-300" /><p className="font-bold">العرض غير متاح حالياً</p><button onClick={() => onNavigate('offers')} className="text-gold-600 font-bold">العودة إلى العروض</button></div>;

  const pkg = offer.packages;
  const original = offer.original_price ?? pkg?.price;
  const discounted = offer.discounted_price ?? (pkg ? Math.round(Number(pkg.price) * (1 - offer.discount_percentage / 100)) : null);
  const image = offer.image_url || pkg?.image_url || 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1600';
  const type = offer.type || pkg?.type || 'رحلة سياحية';

  return (
    <div className="bg-[#fbfaf7] pb-20">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-gray-500"><button onClick={() => onNavigate('home')} className="hover:text-gold-600">الرئيسية</button><ArrowRight size={14} /><button onClick={() => onNavigate('offers')} className="hover:text-gold-600">العروض</button><ArrowRight size={14} /><span className="text-emerald-950 font-bold">{offer.name}</span></div>
      <section className="max-w-7xl mx-auto px-4 pt-3"><div className="relative h-[360px] md:h-[510px] rounded-[2rem] overflow-hidden"><img src={image} alt={offer.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" /><div className="absolute top-6 right-6 bg-red-600 text-white font-black rounded-xl px-4 py-2">خصم {offer.discount_percentage}%</div><div className="absolute top-6 left-6"><ShareButton title={offer.name} compact shareUrl={`${window.location.origin}/#offer/${offer.id}`} /></div><div className="absolute bottom-8 right-6 left-6 text-white"><span className="inline-flex items-center gap-2 text-gold-300 text-sm font-bold mb-3"><Tag size={15} /> {type}</span><h1 className="text-3xl md:text-5xl font-black">{offer.name}</h1><p className="text-white/75 mt-3 max-w-2xl">{offer.description || 'استمتع بتجربة سفر متكاملة مع PROMISE وخدمة تهتم بكل التفاصيل.'}</p></div></div></section>
      <section className="max-w-7xl mx-auto px-4 mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-7">
          <div className="grid sm:grid-cols-3 gap-3"><div className="public-card p-5"><Clock3 size={20} className="text-gold-600 mb-3" /><p className="text-xs text-gray-400">المدة</p><p className="font-black text-emerald-950 mt-1">{pkg?.duration_days || 'حسب البرنامج'} {pkg?.duration_days ? 'أيام' : ''}</p></div><div className="public-card p-5"><MapPin size={20} className="text-gold-600 mb-3" /><p className="text-xs text-gray-400">الوجهة</p><p className="font-black text-emerald-950 mt-1">{type === 'حج' || type === 'عمرة' ? 'مكة والمدينة' : 'وجهة مميزة'}</p></div><div className="public-card p-5"><CalendarDays size={20} className="text-gold-600 mb-3" /><p className="text-xs text-gray-400">صلاحية العرض</p><p className="font-black text-emerald-950 mt-1 text-sm">حتى {new Date(offer.end_date).toLocaleDateString('ar-EG')}</p></div></div>
          <div className="public-card p-7"><h2 className="text-2xl font-black text-emerald-950 mb-5">تفاصيل البرنامج</h2><p className="text-gray-600 leading-relaxed">{offer.description || 'برنامج متكامل تم اختياره بعناية ليمنحك رحلة مريحة ومنظمة. تواصل مع فريقنا لمعرفة الجدول اليومي والتفاصيل المناسبة لاحتياجاتك.'}</p><div className="grid sm:grid-cols-2 gap-3 mt-7">{['إقامة مريحة', 'متابعة من فريق متخصص', 'تنظيم واضح للرحلة', 'خيارات نقل مرنة', 'خدمة عملاء مستمرة', 'أسعار خاصة لفترة محدودة'].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle2 size={17} className="text-emerald-600" />{item}</div>)}</div></div>
          <div className="public-card p-7"><h2 className="text-2xl font-black text-emerald-950 mb-5">شروط الحجز</h2><ul className="space-y-3 text-sm text-gray-600 leading-relaxed list-disc pr-5"><li>يتم تأكيد الحجز بعد مراجعة البيانات والتواصل مع فريق Promise.</li><li>الأسعار قابلة للتحديث حسب التوافر ومواعيد السفر.</li><li>تطبق الشروط الخاصة بالبرنامج عند إتمام الحجز.</li></ul></div>
        </div>
        <aside className="lg:sticky lg:top-28 h-fit"><div className="bg-emerald-950 rounded-[2rem] p-7 text-white shadow-xl"><p className="text-white/60 text-sm">السعر الخاص يبدأ من</p>{original != null && <p className="text-white/45 line-through text-sm mt-2">{Number(original).toLocaleString('ar-EG')} ج.م</p>}{discounted != null ? <p className="text-4xl font-black text-gold-300 mt-1">{Number(discounted).toLocaleString('ar-EG')} <span className="text-sm font-medium">ج.م</span></p> : <p className="text-2xl font-black text-gold-300 mt-2">تواصل معنا</p>}<div className="border-t border-white/10 my-6" /><button onClick={() => onNavigate('booking', { packageId: pkg?.id, type: offer.type || pkg?.type })} className="w-full bg-gradient-gold text-emerald-950 font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-all">احجز الآن</button><button onClick={() => onNavigate('contact')} className="w-full mt-3 border border-white/20 text-white font-bold py-3.5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"><MessageCircle size={17} /> تواصل معنا</button><div className="border-t border-white/10 mt-5 pt-4"><p className="text-white/60 text-xs mb-3">شارك هذا العرض</p><ShareButton title={offer.name} label="مشاركة" shareUrl={`${window.location.origin}/#offer/${offer.id}`} /></div></div></aside>
      </section>
    </div>
  );
}
