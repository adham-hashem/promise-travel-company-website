import { useEffect, useState } from 'react';
import { Clock, Hotel, Plane, ArrowRight, Loader2, Calendar, ShieldCheck, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  packageId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function PackageDetailsPage({ packageId, onNavigate }: Props) {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .maybeSingle();
      if (data) {
        setPkg(data as Package);
      }
      setLoading(false);
    })();
  }, [packageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#0B1F44]" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-400 px-4">
        <Plane size={56} className="mb-4 opacity-30 text-[#0B1F44]" />
        <p className="font-bold text-lg">الباقة غير متوفرة حالياً</p>
        <button onClick={() => onNavigate('home')} className="mt-4 text-[#D4A017] font-bold text-sm">العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FB] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-xs text-gray-500">
          <button onClick={() => onNavigate('home')} className="hover:text-[#D4A017] transition-colors">الرئيسية</button>
          <ArrowRight size={12} className="opacity-50" />
          <button onClick={() => onNavigate(pkg.type === 'حج' ? 'hajj' : 'umrah')} className="hover:text-[#D4A017] transition-colors">
            {pkg.type === 'حج' ? 'باقات الحج' : 'باقات العمرة'}
          </button>
          <ArrowRight size={12} className="opacity-50" />
          <span className="text-[#0B1F44] font-semibold">{pkg.name}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          
          {/* Left Column: Details & Images */}
          <div className="space-y-6">
            {/* Cover Image & Header */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative h-[300px] md:h-[450px] bg-[#0B1F44]">
                <img 
                  src={pkg.image_url || 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=1200'} 
                  alt={pkg.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F44]/80 via-transparent to-transparent" />
                {pkg.featured && (
                  <span className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                    باقة مميزة ⭐
                  </span>
                )}
                <div className="absolute bottom-6 right-6 text-white">
                  <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-2">
                    {pkg.type === 'حج' ? 'رحلة الحج المباركة' : 'رحلة العمرة'}
                  </span>
                  <h1 className="text-2xl md:text-4xl font-black">{pkg.name}</h1>
                </div>
              </div>

              {/* Main Features Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-gray-100 border-t border-gray-100 bg-white">
                {pkg.duration_days && (
                  <div className="p-5 text-center">
                    <span className="block text-xs text-gray-400 font-medium mb-1">المدة</span>
                    <span className="text-sm font-bold text-[#0B1F44] flex items-center justify-center gap-1.5">
                      <Clock size={15} className="text-[#D4A017]" />
                      {pkg.duration_days} يوم
                    </span>
                  </div>
                )}
                {pkg.hotel_makkah && (
                  <div className="p-5 text-center">
                    <span className="block text-xs text-gray-400 font-medium mb-1">فندق مكة</span>
                    <span className="text-sm font-bold text-[#0B1F44] flex items-center justify-center gap-1.5">
                      <span className="text-[#D4A017] text-sm">🕋</span>
                      {pkg.hotel_makkah}
                    </span>
                  </div>
                )}
                {pkg.hotel_madinah && (
                  <div className="p-5 text-center">
                    <span className="block text-xs text-gray-400 font-medium mb-1">فندق المدينة</span>
                    <span className="text-sm font-bold text-[#0B1F44] flex items-center justify-center gap-1.5">
                      <span className="text-[#D4A017] text-sm">🕌</span>
                      {pkg.hotel_madinah}
                    </span>
                  </div>
                )}
                {pkg.airline && (
                  <div className="p-5 text-center">
                    <span className="block text-xs text-gray-400 font-medium mb-1">طيران الرحلة</span>
                    <span className="text-sm font-bold text-[#0B1F44] flex items-center justify-center gap-1.5">
                      <Plane size={15} className="text-[#D4A017]" />
                      {pkg.airline}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description / Program Details */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-[#0B1F44] border-b border-gray-100 pb-3">برنامج وتفاصيل الرحلة</h3>
              {pkg.description ? (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{pkg.description}</p>
              ) : (
                <p className="text-gray-400 text-sm italic">لا توجد تفاصيل إضافية مكتوبة لهذه الباقة حالياً.</p>
              )}
            </div>

            {/* Inclusions / Perks */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-[#0B1F44] mb-4">ماذا تشمل الرحلة؟</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: 'استخراج التأشيرات والوثائق اللازمة', desc: 'نقوم بكافة إجراءات التأشيرة مع الجهات المختصة لراحتكم.' },
                  { title: 'الإقامة الفاخرة المحددة بالباقة', desc: 'فنادق مميزة وموثوقة قريبة من الحرمين الشريفين.' },
                  { title: 'تذاكر الطيران ذهاباً وعودة', desc: 'رحلات جوية مريحة ومباشرة على خطوط جوية معتمدة.' },
                  { title: 'الرعاية والإشراف طوال الرحلة', desc: 'طاقم عمل متكامل لمرافقة وإرشاد المعتمرين والحجاج.' },
                ].map((perk, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <ShieldCheck className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-sm text-[#0B1F44]">{perk.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{perk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Booking Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg sticky top-24">
              <div className="pb-5 border-b border-gray-100 space-y-4">
                <div className="text-center">
                  <span className="text-xs text-gray-400 font-medium">السعر الأساسي للفرد</span>
                  <div className="text-2xl font-black text-[#D4A017] mt-1">
                    {Number(pkg.price).toLocaleString('ar-EG')}
                    <span className="text-xs font-semibold text-[#0B1F44] mr-1">ج.م</span>
                  </div>
                </div>

                <div className="bg-navy-50/50 rounded-2xl p-3.5 border border-navy-100/50 space-y-2">
                  <p className="text-xs font-bold text-[#0B1F44] border-b border-navy-100 pb-1.5">أسعار الغرف المتاحة للفرد:</p>
                  <div className="space-y-1.5 text-xs text-right">
                    <div className="flex justify-between">
                      <span className="text-gray-500">غرفة ثنائية:</span>
                      <span className="font-bold text-[#0B1F44]">{Number(pkg.price_double || pkg.price).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">غرفة ثلاثية:</span>
                      <span className="font-bold text-[#0B1F44]">{Number(pkg.price_triple || pkg.price).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">غرفة رباعية:</span>
                      <span className="font-bold text-[#0B1F44]">{Number(pkg.price_quad || pkg.price).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>
                </div>

                {(pkg.price_child > 0 || pkg.price_infant > 0) && (
                  <div className="bg-gold-50/40 rounded-2xl p-3.5 border border-gold-100/50 space-y-2">
                    <p className="text-xs font-bold text-[#b45309] border-b border-gold-100/50 pb-1.5">أسعار الفئات العمرية:</p>
                    <div className="space-y-1.5 text-xs text-right">
                      {pkg.price_child > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-800">سعر الطفل (Child):</span>
                          <span className="font-bold text-amber-900">{Number(pkg.price_child).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      )}
                      {pkg.price_infant > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-800">سعر الرضيع (Infant):</span>
                          <span className="font-bold text-amber-900">{Number(pkg.price_infant).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">نوع الرحلة:</span>
                  <span className="font-bold text-[#0B1F44]">{pkg.type}</span>
                </div>
                {pkg.duration_days && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">المدة الكلية:</span>
                    <span className="font-bold text-[#0B1F44]">{pkg.duration_days} يوم</span>
                  </div>
                )}
                {pkg.hotel_makkah && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">السكن في مكة:</span>
                    <span className="font-semibold text-navy-905 text-left">{pkg.hotel_makkah}</span>
                  </div>
                )}
                {pkg.hotel_madinah && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">السكن في المدينة:</span>
                    <span className="font-semibold text-navy-905 text-left">{pkg.hotel_madinah}</span>
                  </div>
                )}
                {pkg.airline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">الناقل الجوي:</span>
                    <span className="font-semibold text-[#0B1F44]">{pkg.airline}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate('booking', { packageId: pkg.id, type: pkg.type })}
                className="w-full bg-[#D4A017] hover:bg-[#C08F0F] text-[#0B1F44] font-black py-3.5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-center block text-sm"
              >
                احجز هذه الباقة الآن
              </button>

              <p className="text-[10px] text-center text-gray-400 mt-3 leading-relaxed">
                * الأسعار قابلة للتحديث حسب توافر الحجوزات ومقاعد الطيران.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
