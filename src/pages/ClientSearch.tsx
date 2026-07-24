import { useState, useRef, useEffect } from 'react';
import {
  Search, X, User, Phone, Hash, Calendar, FileText,
  CalendarCheck, CreditCard, Building2, MessageSquare,
  ChevronRight, AlertCircle, Loader2, Wallet, FileCheck,
  ListChecks, Plane, Hotel as HotelIcon, ClipboardList,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, Booking, Invoice, Inquiry, Page, Task } from '../types';

interface FullData {
  found: boolean;
  customer?: Customer & { employees?: { name: string } };
  bookings?: Array<Booking & { package_name?: string; package_type?: string; employee_name?: string }>;
  invoices?: Array<Invoice & { hotel_name?: string }>;
  payments?: Array<{ id: string; amount: number; payment_date: string; payment_method: string; status: string; transaction_number?: string }>;
  documents?: Array<{ id: string; doc_type: string; status: string; created_at: string; doc_number?: string }>;
  operation_files?: Array<{ id: string; op_number: string; file_status: string; financially_approved: boolean; travel_date: string | null; return_date: string | null; visa_status?: string }>;
  visas?: Array<{ id: string; visa_id: string; visa_type: string; country: string; visa_status: string; visa_fee: number; application_date: string | null; issue_date: string | null; expiry_date: string | null }>;
  tasks?: Task[];
  inquiries?: Inquiry[];
  internal_bookings?: Array<{ id: string; trip_name?: string; booking_status: string; total_amount: number; created_at: string }>;
}

const statusColors: Record<string, string> = {
  جديد: 'bg-blue-100 text-blue-700',
  مهتم: 'bg-amber-100 text-amber-700',
  متابعة: 'bg-purple-100 text-purple-700',
  'تم الحجز': 'bg-green-100 text-green-700',
  مكتمل: 'bg-emerald-100 text-emerald-700',
  ملغي: 'bg-red-100 text-red-700',
  مؤكد: 'bg-emerald-100 text-emerald-700',
  معلق: 'bg-amber-100 text-amber-700',
  'غير مدفوع': 'bg-red-100 text-red-700',
  'مدفوع جزئياً': 'bg-amber-100 text-amber-700',
  'مدفوع بالكامل': 'bg-emerald-100 text-emerald-700',
};

interface Props {
  onNavigate: (page: Page, id?: string) => void;
  customerId?: string | null;
}

interface CandidateCustomer {
  id: string;
  name: string;
  client_code: string | null;
  phone: string;
  status: string;
}

export default function ClientSearch({ onNavigate, customerId }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FullData | null>(null);
  const [candidates, setCandidates] = useState<CandidateCustomer[]>([]);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customerId) {
      loadFullById(customerId);
    } else {
      inputRef.current?.focus();
    }
  }, [customerId]);

  const loadFullById = async (id: string) => {
    setLoading(true);
    setNotFound(false);
    setCandidates([]);
    // First get the customer's client_code
    const { data: cust } = await supabase.from('customers').select('client_code').eq('id', id).maybeSingle();
    if (cust?.client_code) {
      setQuery(cust.client_code);
      await loadFullByCode(cust.client_code);
    } else {
      setNotFound(true);
      setLoading(false);
    }
  };

  const loadFullByCode = async (clientCode: string) => {
    setLoading(true);
    setNotFound(false);
    setCandidates([]);
    const { data } = await supabase.rpc('get_customer_full_data', { p_client_code: clientCode });
    const full = data as FullData;
    if (!full || !full.found) {
      setNotFound(true);
    } else {
      setResult(full);
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    setCandidates([]);
    setNotFound(false);

    // 1. Check Invoice Sub-code (CL-1001-INV-01)
    if (q.toUpperCase().includes('-INV-')) {
      const { data: inv } = await supabase.from('invoices').select('customer:customers(client_code)').eq('invoice_number', q).maybeSingle();
      if (inv?.customer?.client_code) {
        await loadFullByCode(inv.customer.client_code);
        return;
      }
    }

    // 2. Check Operation File Number (OP-1001)
    if (q.toUpperCase().startsWith('OP-')) {
      const { data: op } = await supabase.from('operation_files').select('customer:customers(client_code)').eq('op_number', q.toUpperCase()).maybeSingle();
      if (op?.customer?.client_code) {
        await loadFullByCode(op.customer.client_code);
        return;
      }
    }

    // 3. Exact Client Code match (CL-1001, HJ-1001, OM-1001)
    const isCode = /^[A-Z]{2}-\d+$/i.test(q);
    if (isCode) {
      await loadFullByCode(q.toUpperCase());
      return;
    }

    // 4. Query matching customers by name, phone, or passport
    const { data: matches } = await supabase
      .from('customers')
      .select('id, name, client_code, phone, status')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,client_code.ilike.%${q}%,passport_number.ilike.%${q}%`)
      .limit(10);

    const list = (matches as CandidateCustomer[]) || [];
    if (list.length === 0) {
      setNotFound(true);
      setLoading(false);
    } else if (list.length === 1 && list[0].client_code) {
      await loadFullByCode(list[0].client_code);
    } else {
      setCandidates(list);
      setLoading(false);
    }
  };

  const clear = () => {
    setQuery('');
    setResult(null);
    setCandidates([]);
    setNotFound(false);
    inputRef.current?.focus();
  };

  const customer = result?.customer;
  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

  const SectionCard = ({
    title, icon: Icon, count, children, accent = 'text-navy-600',
  }: {
    title: string; icon: React.ElementType; count: number; children: React.ReactNode; accent?: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={15} className={accent} />
          <h3 className="font-semibold text-navy-900 text-sm">{title}</h3>
        </div>
        <span className="text-xs text-gray-500">{count}</span>
      </div>
      {children}
    </div>
  );

  const EmptyRow = () => <p className="text-gray-400 text-sm text-center py-4">لا توجد بيانات</p>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">البحث الذكي الموحد</h1>
        <p className="text-gray-500 text-sm mt-0.5">ابحث بكود العميل CL-1001 لعرض كل البيانات المرتبطة في صفحة واحدة</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-14 bg-white border-2 border-gray-200 focus:border-gold-400 rounded-2xl pr-12 pl-4 text-base font-medium outline-none transition-colors shadow-sm"
              placeholder="ابحث بـ: كود CL-1001، ملف OP-1001، فاتورة، جواز السفر، هاتف، أو اسم العميل"
              dir="rtl"
            />
            {query && (
              <button type="button" onClick={clear} className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
          <button type="submit" disabled={loading || !query.trim()} className="btn-gold h-14 px-8 text-base">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Search size={18} />بحث</>}
          </button>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { label: 'كود العميل', example: 'CL-1001 / HJ-1001' },
            { label: 'ملف تشغيل', example: 'OP-1001' },
            { label: 'فاتورة', example: 'CL-1001-INV-01' },
            { label: 'هاتف / جواز', example: '010XXXXXXXX' },
            { label: 'اسم العميل', example: 'محمد أحمد' },
          ].map(hint => (
            <span key={hint.label} className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              <span className="font-semibold text-gray-700">{hint.label}:</span> {hint.example}
            </span>
          ))}
        </div>
      </form>

      {/* Candidates List */}
      {candidates.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h3 className="font-bold text-navy-900 text-sm">نتائج مطابقة ({candidates.length}) — اختر العميل لعرض ملفه الكامل:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => c.client_code && loadFullByCode(c.client_code)}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gold-400 hover:bg-gold-50/30 transition-all text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-100 text-navy-700 font-bold flex items-center justify-center text-sm">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-navy-900 text-sm group-hover:text-gold-600 transition-colors">{c.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{c.client_code || 'بدون كود'} • {c.phone}</p>
                  </div>
                </div>
                <span className="badge border text-xs bg-navy-50 text-navy-700 border-navy-100">{c.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Not Found */}
      {notFound && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="font-bold text-gray-600 text-lg">لا توجد نتائج</h3>
          <p className="text-gray-400 text-sm mt-1">لم يتم العثور على عميل يطابق "{query}"</p>
        </div>
      )}

      {/* Results */}
      {result && customer && (
        <div className="space-y-5">
          {/* Master Client Code Banner */}
          <div className="bg-gradient-to-l from-navy-900 to-navy-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {customer.client_code && (
                      <span className="px-3 py-1 bg-gold-400/20 border border-gold-400/40 text-gold-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1">
                        <Hash size={11} />{customer.client_code}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${statusColors[customer.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {customer.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                  <div className="flex items-center gap-4 mt-1.5 text-white/70 text-sm">
                    <span className="flex items-center gap-1" dir="ltr"><Phone size={13} />{customer.phone}</span>
                    {customer.service_type && <span>{customer.service_type}</span>}
                    {customer.governorate && <span>{customer.governorate}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('customer-details', customer.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition-colors"
              >
                الملف الكامل <ChevronRight size={15} />
              </button>
            </div>

            {/* Quick stats — all sections */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mt-5 pt-5 border-t border-white/10">
              {[
                { label: 'الحجوزات', value: result.bookings?.length ?? 0, icon: CalendarCheck },
                { label: 'الفواتير', value: result.invoices?.length ?? 0, icon: FileText },
                { label: 'المعاملات', value: result.payments?.length ?? 0, icon: CreditCard },
                { label: 'التشغيل', value: result.operation_files?.length ?? 0, icon: FileCheck },
                { label: 'المستندات', value: result.documents?.length ?? 0, icon: ClipboardList },
                { label: 'المهام', value: result.tasks?.length ?? 0, icon: ListChecks },
                { label: 'الرحلات', value: result.internal_bookings?.length ?? 0, icon: Plane },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <Icon size={18} className="mx-auto mb-1 text-gold-400" />
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/60 mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-navy-900 text-sm mb-4 flex items-center gap-2">
              <Wallet size={15} className="text-gold-500" /> الملخص المالي
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const totalBookings = (result.bookings ?? []).reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
                const totalPaid = (result.payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
                const remaining = Math.max(0, totalBookings - totalPaid);
                return [
                  { label: 'إجمالي الحجوزات', value: totalBookings, color: 'text-navy-900', bg: 'bg-navy-50', raw: false },
                  { label: 'إجمالي المدفوع', value: totalPaid, color: 'text-emerald-600', bg: 'bg-emerald-50', raw: false },
                  { label: 'المتبقي', value: remaining, color: remaining > 0 ? 'text-red-600' : 'text-gray-600', bg: remaining > 0 ? 'bg-red-50' : 'bg-gray-50', raw: false },
                  { label: 'عدد الفواتير', value: result.invoices?.length ?? 0, color: 'text-navy-700', bg: 'bg-gray-50', raw: true },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                    <p className={`font-bold text-lg ${item.color}`}>
                      {item.raw ? item.value : `${fmt(item.value)} ج.م`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Customer Info */}
          <SectionCard title="بيانات العميل" icon={User} count={0}>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'كود العميل', value: customer.client_code, mono: true },
                { label: 'الاسم', value: customer.name },
                { label: 'الهاتف', value: customer.phone, ltr: true },
                { label: 'واتساب', value: customer.whatsapp, ltr: true },
                { label: 'البريد', value: customer.email, ltr: true },
                { label: 'المحافظة', value: customer.governorate },
                { label: 'نوع الخدمة', value: customer.service_type },
                { label: 'الموظف', value: customer.employees?.name },
                { label: 'المصدر', value: customer.source },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">{row.label}</p>
                  <p className={`font-semibold text-navy-900 text-sm ${row.mono ? 'font-mono text-gold-700' : ''}`} dir={row.ltr ? 'ltr' : undefined}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Sub-codes grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bookings */}
            <SectionCard title="الحجوزات" icon={CalendarCheck} count={result.bookings?.length ?? 0}>
              <div className="p-4 space-y-2">
                {result.bookings?.length === 0 ? <EmptyRow /> : result.bookings?.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      {b.booking_number && <p className="text-xs font-mono font-bold text-gold-700 mb-0.5">{b.booking_number}</p>}
                      <p className="text-sm font-semibold text-navy-900">{b.package_name ?? 'حجز'}</p>
                      <p className="text-xs text-gray-500">{new Date(b.booking_date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="text-left">
                      <span className={`badge text-xs ${statusColors[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">{fmt(b.total_amount ?? 0)} ج.م</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Invoices */}
            <SectionCard title="الفواتير" icon={FileText} count={result.invoices?.length ?? 0} accent="text-cyan-600">
              <div className="p-4 space-y-2">
                {result.invoices?.length === 0 ? <EmptyRow /> : result.invoices?.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs font-mono font-bold text-gold-700 mb-0.5">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">{inv.service_type}{inv.hotel_name ? ` · ${inv.hotel_name}` : ''}</p>
                    </div>
                    <div className="text-left">
                      <span className={`badge text-xs ${statusColors[inv.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>{inv.payment_status}</span>
                      <p className="text-xs text-navy-700 font-semibold mt-0.5">{fmt(inv.total_amount)} ج.م</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Payments / Transactions */}
            <SectionCard title="المعاملات المالية" icon={CreditCard} count={result.payments?.length ?? 0} accent="text-emerald-600">
              <div className="p-4 space-y-2">
                {result.payments?.length === 0 ? <EmptyRow /> : result.payments?.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      {p.transaction_number && <p className="text-xs font-mono font-bold text-gold-700 mb-0.5">{p.transaction_number}</p>}
                      <p className="text-sm font-semibold text-emerald-600">{fmt(p.amount)} ج.م</p>
                      <p className="text-xs text-gray-500">{p.payment_method}</p>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Operation Files */}
            <SectionCard title="ملفات التشغيل" icon={FileCheck} count={result.operation_files?.length ?? 0} accent="text-purple-600">
              <div className="p-4 space-y-2">
                {result.operation_files?.length === 0 ? <EmptyRow /> : result.operation_files?.map(op => (
                  <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs font-mono font-bold text-gold-700 mb-0.5">{op.op_number}</p>
                      <p className="text-xs text-gray-500">{op.file_status}{op.travel_date ? ` · سفر: ${new Date(op.travel_date).toLocaleDateString('ar-EG')}` : ''}</p>
                    </div>
                    <span className={`badge text-xs ${op.financially_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {op.financially_approved ? 'معتمد' : 'بانتظار'}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Documents */}
            <SectionCard title="المستندات" icon={ClipboardList} count={result.documents?.length ?? 0} accent="text-amber-600">
              <div className="p-4 space-y-2">
                {result.documents?.length === 0 ? <EmptyRow /> : result.documents?.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      {doc.doc_number && <p className="text-xs font-mono font-bold text-gold-700 mb-0.5">{doc.doc_number}</p>}
                      <p className="text-sm font-semibold text-navy-900">{doc.doc_type}</p>
                    </div>
                    <span className="badge text-xs bg-gray-100 text-gray-600">{doc.status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Tasks */}
            <SectionCard title="المهام" icon={ListChecks} count={result.tasks?.length ?? 0} accent="text-indigo-600">
              <div className="p-4 space-y-2">
                {result.tasks?.length === 0 ? <EmptyRow /> : result.tasks?.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      {t.client_code && <p className="text-xs font-mono font-bold text-gold-700 mb-0.5">{t.client_code}-TSK</p>}
                      <p className="text-sm font-semibold text-navy-900">{t.title}</p>
                      {t.department && <p className="text-xs text-gray-500">{t.department}</p>}
                    </div>
                    <span className={`badge text-xs ${statusColors[t.status] ?? 'bg-blue-100 text-blue-700'}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Internal Trip Bookings */}
            {(result.internal_bookings?.length ?? 0) > 0 && (
              <SectionCard title="الرحلات الداخلية" icon={Plane} count={result.internal_bookings?.length ?? 0} accent="text-cyan-600">
                <div className="p-4 space-y-2">
                  {result.internal_bookings?.map(it => (
                    <div key={it.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{it.trip_name ?? 'رحلة'}</p>
                        <p className="text-xs text-gray-500">{new Date(it.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <div className="text-left">
                        <span className="badge text-xs bg-blue-100 text-blue-700">{it.booking_status}</span>
                        <p className="text-xs text-navy-700 font-semibold mt-0.5">{fmt(it.total_amount)} ج.م</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Inquiries */}
            {(result.inquiries?.length ?? 0) > 0 && (
              <SectionCard title="الاستعلامات" icon={MessageSquare} count={result.inquiries?.length ?? 0} accent="text-blue-600">
                <div className="p-4 space-y-2">
                  {result.inquiries?.map(inq => (
                    <div key={inq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-mono font-semibold text-navy-700">{inq.inquiry_number}</p>
                        <p className="text-xs text-gray-500">{inq.service_type} · {inq.source}</p>
                      </div>
                      <span className="badge text-xs bg-blue-100 text-blue-700">{inq.status}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
