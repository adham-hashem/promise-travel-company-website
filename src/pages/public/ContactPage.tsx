import { Phone, MapPin, Clock, MessageCircle, Facebook } from 'lucide-react';

export default function ContactPage() {
  const contacts = [
    {
      icon: Phone,
      title: 'أرقام الهاتف',
      items: [
        { label: 'الخط الأول', value: '01011106989', href: 'tel:01011106989' },
        { label: 'الخط الثاني', value: '01055503857', href: 'tel:01055503857' },
      ],
    },
    {
      icon: Facebook,
      title: 'فيسبوك',
      items: [{ label: 'صفحة الشركة', value: 'facebook.com/Promisetravil', href: 'https://www.facebook.com/Promisetravil' }],
    },
    {
      icon: MessageCircle,
      title: 'الرسائل',
      items: [{ label: 'تواصل سريع', value: 'Promise Travel', href: 'https://www.facebook.com/Promisetravil' }],
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img src="maka.webp" alt="تواصل معنا" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12 text-white">
          <h1 className="text-3xl md:text-5xl font-black mb-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">تواصل معنا</h1>
          <p className="text-white text-lg drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">نحن هنا لمساعدتك — تواصل معنا في أي وقت</p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-gold-600 font-bold text-sm">معلومات التواصل</span>
            <h2 className="text-2xl md:text-3xl font-black text-navy-900 mt-2">طرق التواصل المتاحة</h2>
            <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto">فريقنا متاح لمساعدتك على مدار الأسبوع. اختر الطريقة الأنسب لك للتواصل معنا.</p>
            <p className="mt-3 text-sm font-semibold text-[#D4A017]">نخدم عملاءنا في جميع محافظات مصر.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {contacts.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-navy flex items-center justify-center text-gold-400 mx-auto mb-4">
                    <Icon size={26} />
                  </div>
                  <h3 className="font-black text-navy-900 text-lg mb-4">{c.title}</h3>
                  <div className="space-y-2">
                    {c.items.map((it) => (
                      <div key={it.value}>
                        <p className="text-xs text-gray-400">{it.label}</p>
                        {it.href ? (
                          <a href={it.href} target={it.href.startsWith('http') ? '_blank' : undefined} rel={it.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block text-navy-800 font-bold text-sm transition-colors hover:text-gold-600" dir="ltr">
                            {it.value}
                          </a>
                        ) : (
                          <p className="text-navy-800 font-bold text-sm" dir="ltr">{it.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Address + hours full-width card */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-navy rounded-3xl p-7 text-white">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-gold-400 flex-shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg mb-2">العنوان / الموقع</h3>
                  <p className="text-white/80 text-sm leading-relaxed">دمياط الجديدة، المنطقة المركزية، بجوار مطعم عالفحم، جمهورية مصر العربية</p>
                  <p className="text-white/60 text-xs mt-2">نخدم عملاءنا في جميع محافظات مصر.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center text-navy-900 flex-shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-black text-navy-900 text-lg mb-2">ساعات العمل</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>السبت — الخميس: <span className="font-bold text-navy-800">9 صباحاً — 9 مساءً</span></p>
                    <p>الجمعة: <span className="font-bold text-navy-800">2 ظهراً — 9 مساءً</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="mt-8 text-center">
            <a
              href="https://wa.me/201001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <MessageCircle size={20} />
              تواصل عبر واتساب
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
