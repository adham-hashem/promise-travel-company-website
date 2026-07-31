import { useState, useRef } from 'react';
import { 
  FileText, User, Calendar, Plane, Building2, Utensils, 
  Map, Bus, Users, DollarSign, FileCheck, Printer, RefreshCw,
  Info, Wallet
} from 'lucide-react';

export default function QuotationForm() {
  const [form, setForm] = useState({
    // Client Data
    clientName: '',
    quotationDate: new Date().toISOString().split('T')[0],
    programGrade: 'VIP', // VIP, Economy, etc.
    programSection: 'حج', // حج, عمرة, سياحة
    
    // Trip Data
    departureDate: '',
    returnDate: '',
    daysCount: 0,
    nightsCount: 0,
    
    // Hotel Mecca
    meccaHotelName: '',
    meccaHotelStars: 5,
    meccaHotelNights: 0,
    
    // Hotel Medina
    medinaHotelName: '',
    medinaHotelStars: 5,
    medinaHotelNights: 0,
    
    // Meals
    mealsType: 'إفطار فقط', // إفطار, نصف إقامة, إقامة كاملة, بدون
    mealsDescription: '',
    
    // Flight
    airline: '',
    flightClass: 'سياحية',
    
    // Itinerary
    departureCity: 'القاهرة',
    arrivalCity: 'جدة',
    departureRoute: '',
    returnRoute: '',
    
    // Transport
    transportType: 'حافلة VIP',
    transportClass: 'ممتازة',
    
    // Supervision
    supervisionProgram: 'إشراف ديني وإداري متميز طوال الرحلة.\nتنظيم مزارات مكة المكرمة والمدينة المنورة (جبل النور، غار ثور، جبل أحد، مسجد قباء، الخ).',
    
    // Cost
    pricePerPerson: 0,
    personsCount: 1,
    pricePerChild: 0,
    childrenCount: 0,
    additionalFees: 0,
    discounts: 0,
    
    // Policies
    paymentPolicy: '1. يتم سداد 50% من إجمالي قيمة البرنامج عند الحجز.\n2. يتم سداد باقي المبلغ قبل السفر بـ 15 يوماً كحد أقصى.\n3. في حالة الإلغاء قبل السفر بـ 30 يوماً، يتم خصم 20% من إجمالي المبلغ.\n4. الأسعار قابلة للتغيير في حال حدوث تغيير في أسعار الصرف أو ضرائب الطيران.',
    termsAndConditions: '• جواز سفر صالح لمدة 6 أشهر على الأقل من تاريخ السفر.\n• التطعيمات اللازمة وتصريح السفر (إن وجد).\n• الشركة غير مسؤولة عن أي تأخير خارج عن إرادتها في مواعيد الطيران.\n• التسكين في الفنادق يبدأ الساعة 2 ظهراً والمغادرة الساعة 12 ظهراً.\n• الأسعار مبنية على الوضع الحالي وفي حال وجود ضرائب أو رسوم إضافية تفرضها السلطات يتم إضافتها على السعر.',
  });

  const totalCost = 
    (form.pricePerPerson * form.personsCount) + 
    (form.pricePerChild * form.childrenCount) + 
    form.additionalFees - form.discounts;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (Number(value) || 0) : value
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟')) {
      setForm({
        clientName: '',
        quotationDate: new Date().toISOString().split('T')[0],
        programGrade: 'VIP',
        programSection: 'حج',
        departureDate: '',
        returnDate: '',
        daysCount: 0,
        nightsCount: 0,
        meccaHotelName: '',
        meccaHotelStars: 5,
        meccaHotelNights: 0,
        medinaHotelName: '',
        medinaHotelStars: 5,
        medinaHotelNights: 0,
        mealsType: 'إفطار فقط',
        mealsDescription: '',
        airline: '',
        flightClass: 'سياحية',
        departureCity: 'القاهرة',
        arrivalCity: 'جدة',
        departureRoute: '',
        returnRoute: '',
        transportType: 'حافلة VIP',
        transportClass: 'ممتازة',
        supervisionProgram: 'إشراف ديني وإداري متميز طوال الرحلة.\nتنظيم مزارات مكة المكرمة والمدينة المنورة.',
        pricePerPerson: 0,
        personsCount: 1,
        pricePerChild: 0,
        childrenCount: 0,
        additionalFees: 0,
        discounts: 0,
        paymentPolicy: '1. يتم سداد 50% من إجمالي قيمة البرنامج عند الحجز.\n2. يتم سداد باقي المبلغ قبل السفر بـ 15 يوماً كحد أقصى.',
        termsAndConditions: '• جواز سفر صالح لمدة 6 أشهر على الأقل من تاريخ السفر.\n• التطعيمات اللازمة وتصريح السفر (إن وجد).',
      });
    }
  };

  // Section UI helper
  const SectionHeader = ({ title, icon: Icon }: { title: string, icon: React.ElementType }) => (
    <div className="flex items-center gap-2 text-navy-900 mb-4 pb-2 border-b border-gray-200">
      <div className="p-2 bg-navy-50 text-navy-700 rounded-lg"><Icon size={18} /></div>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header (No Print) */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">طلب عرض سعر</h1>
          <p className="text-gray-500 text-sm mt-0.5">إنشاء نموذج عرض سعر بصيغة PDF</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> إعادة تعيين
          </button>
          <button onClick={handlePrint} className="btn-gold flex items-center gap-2">
            <Printer size={16} /> طباعة / تحميل PDF
          </button>
        </div>
      </div>

      {/* Form Area (No Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 no-print">
        
        {/* 1. Client Data */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-1">
          <SectionHeader title="بيانات العميل والبرنامج" icon={User} />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل (الجهة)</label>
              <input type="text" name="clientName" value={form.clientName} onChange={handleChange} className="input-field" placeholder="اسم العميل الموجه له العرض" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ العرض</label>
              <input type="date" name="quotationDate" value={form.quotationDate} onChange={handleChange} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                <select name="programSection" value={form.programSection} onChange={handleChange} className="input-field">
                  <option value="حج">حج</option>
                  <option value="عمرة">عمرة</option>
                  <option value="سياحة داخلية">سياحة داخلية</option>
                  <option value="سياحة خارجية">سياحة خارجية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">درجة البرنامج</label>
                <input type="text" name="programGrade" value={form.programGrade} onChange={handleChange} className="input-field" placeholder="مثال: VIP, اقتصادي" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Trip Data */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-1">
          <SectionHeader title="بيانات الرحلة" icon={Calendar} />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الذهاب</label>
                <input type="date" name="departureDate" value={form.departureDate} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ العودة</label>
                <input type="date" name="returnDate" value={form.returnDate} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الأيام</label>
                <input type="number" name="daysCount" value={form.daysCount || ''} onChange={handleChange} className="input-field" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الليالي</label>
                <input type="number" name="nightsCount" value={form.nightsCount || ''} onChange={handleChange} className="input-field" min="0" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Hotels */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-1">
          <SectionHeader title="الإقامة الفندقية" icon={Building2} />
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">مكة المكرمة</p>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-3">
                  <input type="text" name="meccaHotelName" value={form.meccaHotelName} onChange={handleChange} className="input-field text-sm px-2 py-1.5" placeholder="اسم الفندق" />
                </div>
                <div className="col-span-1.5">
                  <input type="number" name="meccaHotelStars" value={form.meccaHotelStars || ''} onChange={handleChange} className="input-field text-sm px-2 py-1.5 text-center" placeholder="النجوم" />
                </div>
                <div className="col-span-1.5">
                  <input type="number" name="meccaHotelNights" value={form.meccaHotelNights || ''} onChange={handleChange} className="input-field text-sm px-2 py-1.5 text-center" placeholder="الليالي" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">المدينة المنورة</p>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-3">
                  <input type="text" name="medinaHotelName" value={form.medinaHotelName} onChange={handleChange} className="input-field text-sm px-2 py-1.5" placeholder="اسم الفندق" />
                </div>
                <div className="col-span-1.5">
                  <input type="number" name="medinaHotelStars" value={form.medinaHotelStars || ''} onChange={handleChange} className="input-field text-sm px-2 py-1.5 text-center" placeholder="النجوم" />
                </div>
                <div className="col-span-1.5">
                  <input type="number" name="medinaHotelNights" value={form.medinaHotelNights || ''} onChange={handleChange} className="input-field text-sm px-2 py-1.5 text-center" placeholder="الليالي" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Flight & Itinerary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-1">
          <SectionHeader title="الطيران ومسار الرحلة" icon={Plane} />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شركة الطيران</label>
                <input type="text" name="airline" value={form.airline} onChange={handleChange} className="input-field" placeholder="مثال: مصر للطيران" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">درجة الطيران</label>
                <input type="text" name="flightClass" value={form.flightClass} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مدينة المغادرة</label>
                <input type="text" name="departureCity" value={form.departureCity} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مدينة الوصول</label>
                <input type="text" name="arrivalCity" value={form.arrivalCity} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مسار الرحلة بالتفصيل</label>
              <input type="text" name="departureRoute" value={form.departureRoute} onChange={handleChange} className="input-field mb-2" placeholder="الذهاب: (مثال: القاهرة - جدة)" />
              <input type="text" name="returnRoute" value={form.returnRoute} onChange={handleChange} className="input-field" placeholder="العودة: (مثال: المدينة - القاهرة)" />
            </div>
          </div>
        </div>

        {/* 5. Transport & Meals */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-1">
          <SectionHeader title="التنقلات والوجبات" icon={Bus} />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع التنقلات الداخلية</label>
                <input type="text" name="transportType" value={form.transportType} onChange={handleChange} className="input-field" placeholder="حافلة, سيارة خاصة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">درجة النقل</label>
                <input type="text" name="transportClass" value={form.transportClass} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <div className="h-px bg-gray-100 my-4"></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Utensils size={14} className="text-gray-400"/> نوع الوجبات</label>
              <select name="mealsType" value={form.mealsType} onChange={handleChange} className="input-field mb-2">
                <option value="بدون وجبات">بدون وجبات</option>
                <option value="إفطار فقط">إفطار فقط</option>
                <option value="نصف إقامة (إفطار وعشاء)">نصف إقامة (إفطار وعشاء)</option>
                <option value="إقامة كاملة (3 وجبات)">إقامة كاملة (3 وجبات)</option>
                <option value="أخرى">أخرى</option>
              </select>
              <input type="text" name="mealsDescription" value={form.mealsDescription} onChange={handleChange} className="input-field" placeholder="وصف إضافي للوجبات (اختياري)" />
            </div>
          </div>
        </div>

        {/* 6. Costs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-1">
          <SectionHeader title="تكلفة البرنامج" icon={DollarSign} />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الفرد البالغ</label>
                <input type="number" name="pricePerPerson" value={form.pricePerPerson || ''} onChange={handleChange} className="input-field" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العدد</label>
                <input type="number" name="personsCount" value={form.personsCount || ''} onChange={handleChange} className="input-field" min="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الطفل</label>
                <input type="number" name="pricePerChild" value={form.pricePerChild || ''} onChange={handleChange} className="input-field" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الأطفال</label>
                <input type="number" name="childrenCount" value={form.childrenCount || ''} onChange={handleChange} className="input-field" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رسوم إضافية</label>
                <input type="number" name="additionalFees" value={form.additionalFees || ''} onChange={handleChange} className="input-field" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">خصومات</label>
                <input type="number" name="discounts" value={form.discounts || ''} onChange={handleChange} className="input-field text-red-500" min="0" />
              </div>
            </div>
            <div className="mt-2 p-3 bg-navy-50 rounded-xl border border-navy-100 flex justify-between items-center">
              <span className="font-bold text-navy-900">الإجمالي النهائي:</span>
              <span className="text-xl font-bold text-emerald-600">{totalCost.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>

        {/* 7. Text Areas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <SectionHeader title="الإشراف والزيارات" icon={Users} />
            <textarea name="supervisionProgram" value={form.supervisionProgram} onChange={handleChange} className="input-field min-h-[150px] resize-y leading-relaxed" placeholder="تفاصيل الإشراف والزيارات والمزارات..." />
          </div>
          <div>
            <SectionHeader title="سياسات السداد" icon={Wallet} />
            <textarea name="paymentPolicy" value={form.paymentPolicy} onChange={handleChange} className="input-field min-h-[150px] resize-y leading-relaxed" placeholder="شروط الدفع المسبق، الإلغاء، وغيرها..." />
          </div>
          <div>
            <SectionHeader title="الشروط والأحكام" icon={FileCheck} />
            <textarea name="termsAndConditions" value={form.termsAndConditions} onChange={handleChange} className="input-field min-h-[150px] resize-y leading-relaxed" placeholder="الشروط العامة، الأوراق المطلوبة، وغيرها..." />
          </div>
        </div>
      </div>


      {/* 
        ================================================================================
        PRINT TEMPLATE (Visible only when printing)
        ================================================================================
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #quotation-print, #quotation-print * { visibility: visible; }
          #quotation-print { position: absolute; left: 0; top: 0; width: 100%; font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
          .no-print { display: none !important; }
          .print-header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .print-title { font-size: 28px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          .print-subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
          .print-section { margin-bottom: 25px; page-break-inside: avoid; }
          .print-section-title { font-size: 18px; font-weight: bold; color: #b48600; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; display: flex; align-items: center; gap: 8px; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
          .print-table th, .print-table td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; }
          .print-table th { background-color: #f8fafc; color: #0f172a; font-weight: bold; width: 25%; }
          .print-table td { background-color: #ffffff; color: #334155; }
          
          .print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .print-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
          .print-box-title { font-weight: bold; color: #0f172a; margin-bottom: 8px; font-size: 14px; }
          .print-text { font-size: 13px; color: #475569; line-height: 1.8; white-space: pre-wrap; }
          
          .print-total-box { margin-top: 15px; background: #0f172a; color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
          .print-total-label { font-size: 18px; font-weight: bold; color: #e2e8f0; }
          .print-total-value { font-size: 24px; font-weight: bold; color: #fbbf24; }
          
          .print-footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; page-break-inside: avoid; }
          .signature-area { display: flex; justify-content: space-around; margin-top: 40px; margin-bottom: 30px; }
          .signature-box { text-align: center; width: 30%; }
          .signature-line { border-top: 1px solid #cbd5e1; margin-top: 50px; padding-top: 5px; font-weight: bold; color: #0f172a; }
          
          @page { margin: 15mm; }
        }
      `}}/>

      <div id="quotation-print" className="hidden print:block bg-white text-right">
        {/* Header */}
        <div className="print-header">
          <div>
            <h1 className="print-title">عرض سعر برنامج سياحي</h1>
            <p className="print-subtitle">PROMISE TRAVEL & TOURS</p>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">التاريخ: {new Date(form.quotationDate).toLocaleDateString('ar-EG')}</p>
            <p className="text-sm text-gray-500 mt-1">السادة / <span className="font-bold text-navy-900 text-base">{form.clientName || '..............................'}</span></p>
            <p className="text-xs text-gray-400 mt-1">تحية طيبة وبعد،،،</p>
          </div>
        </div>

        {/* 1. Trip Summary */}
        <div className="print-section">
          <div className="print-section-title">ملخص البرنامج ({form.programSection} - {form.programGrade})</div>
          <table className="print-table">
            <tbody>
              <tr>
                <th>تاريخ الذهاب</th>
                <td>{form.departureDate ? new Date(form.departureDate).toLocaleDateString('ar-EG') : '—'}</td>
                <th>تاريخ العودة</th>
                <td>{form.returnDate ? new Date(form.returnDate).toLocaleDateString('ar-EG') : '—'}</td>
              </tr>
              <tr>
                <th>المدة الزمنية</th>
                <td>{form.daysCount} أيام / {form.nightsCount} ليالي</td>
                <th>خط السير</th>
                <td>
                  {form.departureRoute && <div><strong>الذهاب:</strong> {form.departureRoute}</div>}
                  {form.returnRoute && <div><strong>العودة:</strong> {form.returnRoute}</div>}
                  {!form.departureRoute && !form.returnRoute && '—'}
                </td>
              </tr>
              <tr>
                <th>الطيران</th>
                <td>{form.airline || '—'} ({form.flightClass})</td>
                <th>التنقلات الداخلية</th>
                <td>{form.transportType} ({form.transportClass})</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Accommodation */}
        <div className="print-section">
          <div className="print-section-title">الإقامة الفندقية والوجبات</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{width: '20%'}}>المدينة</th>
                <th style={{width: '40%'}}>اسم الفندق</th>
                <th style={{width: '20%'}}>المستوى (النجوم)</th>
                <th style={{width: '20%'}}>عدد الليالي</th>
              </tr>
            </thead>
            <tbody>
              {form.meccaHotelName && (
                <tr>
                  <td className="font-bold text-center">مكة المكرمة</td>
                  <td>{form.meccaHotelName}</td>
                  <td className="text-center">{form.meccaHotelStars ? `${form.meccaHotelStars} نجوم` : '—'}</td>
                  <td className="text-center">{form.meccaHotelNights} ليالي</td>
                </tr>
              )}
              {form.medinaHotelName && (
                <tr>
                  <td className="font-bold text-center">المدينة المنورة</td>
                  <td>{form.medinaHotelName}</td>
                  <td className="text-center">{form.medinaHotelStars ? `${form.medinaHotelStars} نجوم` : '—'}</td>
                  <td className="text-center">{form.medinaHotelNights} ليالي</td>
                </tr>
              )}
              {!form.meccaHotelName && !form.medinaHotelName && (
                <tr><td colSpan={4} className="text-center text-gray-500 py-4">لم يتم تحديد فنادق</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-2 text-sm">
            <span className="font-bold text-gray-800 ml-2">نظام الوجبات:</span>
            <span className="text-gray-600">{form.mealsType} {form.mealsDescription && `- ${form.mealsDescription}`}</span>
          </div>
        </div>

        {/* 3. Text Areas (Supervision, Policies, Terms) */}
        <div className="print-section">
          <div className="print-grid">
            <div className="print-box">
              <div className="print-box-title">برنامج الإشراف والزيارات</div>
              <div className="print-text">{form.supervisionProgram || 'لا يوجد'}</div>
            </div>
            <div className="print-box">
              <div className="print-box-title">سياسات التعاقد والسداد</div>
              <div className="print-text">{form.paymentPolicy || 'لا يوجد'}</div>
            </div>
          </div>
        </div>
        
        <div className="print-section">
          <div className="print-box">
            <div className="print-box-title">الشروط والأحكام العامة</div>
            <div className="print-text">{form.termsAndConditions || 'لا يوجد'}</div>
          </div>
        </div>

        {/* 4. Financials */}
        <div className="print-section" style={{ pageBreakInside: 'avoid' }}>
          <div className="print-section-title">التكلفة المالية</div>
          <table className="print-table">
            <thead>
              <tr>
                <th>البيان</th>
                <th>العدد</th>
                <th>سعر الفرد</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {form.personsCount > 0 && (
                <tr>
                  <td>سعر البالغين</td>
                  <td className="text-center">{form.personsCount}</td>
                  <td className="text-center">{form.pricePerPerson.toLocaleString('ar-EG')} ج.م</td>
                  <td className="text-center font-bold">{(form.pricePerPerson * form.personsCount).toLocaleString('ar-EG')} ج.م</td>
                </tr>
              )}
              {form.childrenCount > 0 && (
                <tr>
                  <td>سعر الأطفال</td>
                  <td className="text-center">{form.childrenCount}</td>
                  <td className="text-center">{form.pricePerChild.toLocaleString('ar-EG')} ج.م</td>
                  <td className="text-center font-bold">{(form.pricePerChild * form.childrenCount).toLocaleString('ar-EG')} ج.م</td>
                </tr>
              )}
              {form.additionalFees > 0 && (
                <tr>
                  <td colSpan={3}>رسوم إضافية</td>
                  <td className="text-center font-bold">{form.additionalFees.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              )}
              {form.discounts > 0 && (
                <tr>
                  <td colSpan={3}>خصومات</td>
                  <td className="text-center font-bold text-red-600">-{form.discounts.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="print-total-box">
            <span className="print-total-label">إجمالي تكلفة البرنامج المقترحة:</span>
            <span className="print-total-value">{totalCost.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        {/* Signatures */}
        <div className="signature-area">
          <div className="signature-box">
            <div className="signature-line">توقيع العميل بالموافقة</div>
          </div>
          <div className="signature-box">
            <div className="signature-line">توقيع مدير المبيعات</div>
          </div>
          <div className="signature-box">
            <div className="signature-line">ختم الشركة المعتمد</div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-footer">
          <p>PROMISE TRAVEL & TOURS - نظام إدارة الحج والعمرة | جميع الأسعار قابلة للتغيير بناءً على سياسات الطيران والضرائب</p>
        </div>
      </div>
      
    </div>
  );
}
