import { useEffect, useState } from 'react';
import {
  ArrowLeft, Phone, MapPin, Mail, User, Package,
  MessageCircle, Calendar, CheckCircle, Plus, Clock, Hash,
  Plane, CreditCard as CardIcon, FileText, CreditCard, Wallet, Receipt,
  CheckCircle2, AlertCircle, Loader2, Hotel as HotelIcon, FileCheck, GitCommit, Plane as PlaneIcon,
  Eye, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, CommunicationLog, CustomerStatus, CommType, Page, Booking, Invoice, Payment, DocumentRecord, OperationFile, TimelineEvent, TravelChecklist as ChecklistType, WorkflowTimelineEvent } from '../types';
import DocumentsSection from '../components/DocumentsSection';

const statusColors: Record<CustomerStatus, string> = {
  جديد: 'bg-blue-100 text-blue-700 border-blue-200',
  مهتم: 'bg-amber-100 text-amber-700 border-amber-200',
  متابعة: 'bg-purple-100 text-purple-700 border-purple-200',
  حجز: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  مغلق: 'bg-gray-200 text-gray-600 border-gray-300',
  'تم الحجز': 'bg-green-100 text-green-700 border-green-200',
  مكتمل: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ملغي: 'bg-red-100 text-red-700 border-red-200',
};

const allStatuses: CustomerStatus[] = ['جديد', 'مهتم', 'متابعة', 'حجز', 'مغلق', 'تم الحجز', 'مكتمل', 'ملغي'];
const commTypeIcons: Record<CommType, React.ElementType> = {
  مكالمة: Phone, واتساب: MessageCircle, زيارة: User, 'بريد إلكتروني': Mail,
};
const commTypeColors: Record<CommType, string> = {
  مكالمة: 'bg-blue-50 text-blue-600',
  واتساب: 'bg-green-50 text-green-600',
  زيارة: 'bg-purple-50 text-purple-600',
  'بريد إلكتروني': 'bg-orange-50 text-orange-600',
};

interface Props {
  customerId?: string;
  onNavigate: (page: Page) => void;
}

interface FinSummary {
  totalBookings: number;
  totalPaid: number;
  totalRemaining: number;
  invoiceCount: number;
}

export default function CustomerDetails({ customerId, onNavigate }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [opFiles, setOpFiles] = useState<OperationFile[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistType | null>(null);
  const [visaRecord, setVisaRecord] = useState<{ visa_status?: string; visa_upload_status?: string; visa_file_path?: string; visa_file_name?: string; visa_number?: string; visa_id?: string } | null>(null);
  const [workflowTimeline, setWorkflowTimeline] = useState<WorkflowTimelineEvent[]>([]);
  const [fin, setFin] = useState<FinSummary>({ totalBookings: 0, totalPaid: 0, totalRemaining: 0, invoiceCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddLog, setShowAddLog] = useState(false);
  const [newLog, setNewLog] = useState({ type: 'مكالمة' as CommType, result: '', notes: '', agreed_on: '', next_follow_up: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!customerId) { setLoading(false); return; }
      const [custRes, logsRes] = await Promise.all([
        supabase.from('customers').select('*, packages(*), employees(*)').eq('id', customerId).maybeSingle(),
        supabase.from('communication_logs').select('*, employees(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
      ]);
      setCustomer((custRes.data as Customer) || null);
      setLogs((logsRes.data as CommunicationLog[]) || []);

      const [bkRes, invRes, payRes, opsRes, docsRes, tlRes] = await Promise.all([
        supabase.from('bookings').select('*, packages(*), employees(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*, hotels(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('customer_id', customerId).order('payment_date', { ascending: false }),
        supabase.from('operation_files').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('documents').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('customer_timeline').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      ]);
      setBookings((bkRes.data as Booking[]) || []);
      setInvoices((invRes.data as Invoice[]) || []);
      setPayments((payRes.data as Payment[]) || []);
      setOpFiles((opsRes.data as OperationFile[]) || []);
      setDocs((docsRes.data as DocumentRecord[]) || []);
      setTimeline((tlRes.data as TimelineEvent[]) || []);
      // Fetch travel checklist
      const { data: clData } = await supabase.from('travel_checklist').select('*').eq('customer_id', customerId).maybeSingle();
      setChecklist(clData as ChecklistType | null);
      // Fetch visa record
      const { data: visaData } = await supabase.from('visa_management').select('visa_id, visa_status, visa_upload_status, visa_file_path, visa_file_name, visa_number').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setVisaRecord(visaData as typeof visaRecord);
      // Fetch workflow timeline
      const { data: tlData } = await supabase.from('workflow_timeline').select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
      setWorkflowTimeline((tlData as WorkflowTimelineEvent[]) || []);

      const totalBookings = (bkRes.data as Booking[])?.reduce((s, b) => s + Number(b.total_amount || 0), 0) || 0;
      const totalPaid = (payRes.data as Payment[])?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0;
      const totalRemaining = Math.max(0, totalBookings - totalPaid);
      setFin({ totalBookings, totalPaid, totalRemaining, invoiceCount: (invRes.data as Invoice[])?.length || 0 });
      setLoading(false);
    }
    load();
  }, [customerId]);

  const updateStatus = async (status: CustomerStatus) => {
    if (!customer) return;
    setCustomer({ ...customer, status });
    if (customerId) await supabase.from('customers').update({ status }).eq('id', customerId);
  };

  const addLog = async () => {
    if (!newLog.notes) return;
    setSaving(true);
    if (customerId) {
      await supabase.from('communication_logs').insert({ ...newLog, customer_id: customerId });
      const { data } = await supabase.from('communication_logs').select('*, employees(*)').eq('customer_id', customerId).order('created_at', { ascending: false });
      setLogs((data as CommunicationLog[]) || []);
    }
    setNewLog({ type: 'مكالمة', result: '', notes: '', agreed_on: '', next_follow_up: '' });
    setShowAddLog(false);
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" /></div>;
  if (!customer) {
    return (
      <div className="text-center py-16 text-gray-400">
        <User size={48} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">لم يتم تحديد عميل</p>
        <button onClick={() => onNavigate('customers')} className="mt-4 text-gold-600 font-bold text-sm">العودة للعملاء</button>
      </div>
    );
  }

  const lastLog = logs[0];
  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('customers')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="section-title">تفاصيل العميل</h2>
          <p className="section-subtitle">{customer.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="space-y-5">
          {/* Customer Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-navy p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl mx-auto mb-3">
                {customer.name.charAt(0)}
              </div>
              {customer.client_code && (
                <div className="flex justify-center mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold-400/20 border border-gold-400/40 text-gold-300 rounded-lg text-sm font-mono font-bold">
                    <Hash size={13} />{customer.client_code}
                  </span>
                </div>
              )}
              <h3 className="text-white font-bold text-lg">{customer.name}</h3>
              <p className="text-gold-300 text-sm mt-1">{customer.service_type || 'عميل'}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={`badge border ${statusColors[customer.status]}`}>{customer.status}</span>
                {customer.documents_status && (
                  <span className={`badge ${customer.documents_status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {customer.documents_status === 'مكتمل' ? <CheckCircle2 size={10} className="inline ml-1" /> : <AlertCircle size={10} className="inline ml-1" />}
                    {customer.documents_status}
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { icon: Phone, label: 'الهاتف', value: customer.phone, dir: 'ltr' as const },
                { icon: Phone, label: 'واتساب', value: customer.whatsapp, dir: 'ltr' as const },
                { icon: Mail, label: 'البريد', value: customer.email, dir: 'ltr' as const },
                { icon: MapPin, label: 'المدينة', value: customer.city },
                { icon: Package, label: 'الباقة', value: customer.packages?.name },
                { icon: User, label: 'الموظف', value: customer.employees?.name },
              ].map((item, i) => item.value && (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                    <item.icon size={14} className="text-navy-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5" dir={item.dir}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accounts Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-gold-500" /> الحسابات المالية
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-xs text-gray-500 flex items-center gap-1.5"><Receipt size={13} className="text-navy-500" /> إجمالي الحجوزات</span>
                <span className="font-bold text-navy-900 text-sm">{fmt(fin.totalBookings)} <span className="text-xs text-gray-400">ج.م</span></span>
              </div>
              <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3">
                <span className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={13} /> إجمالي المدفوع</span>
                <span className="font-bold text-emerald-700 text-sm">{fmt(fin.totalPaid)} <span className="text-xs">ج.م</span></span>
              </div>
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${fin.totalRemaining > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <span className={`text-xs flex items-center gap-1.5 ${fin.totalRemaining > 0 ? 'text-red-600' : 'text-gray-500'}`}><CreditCard size={13} /> المتبقي</span>
                <span className={`font-bold text-sm ${fin.totalRemaining > 0 ? 'text-red-600' : 'text-gray-600'}`}>{fmt(fin.totalRemaining)} <span className="text-xs">ج.م</span></span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-xs text-gray-500 flex items-center gap-1.5"><FileText size={13} className="text-navy-500" /> عدد الفواتير</span>
                <span className="font-bold text-navy-900 text-sm">{fin.invoiceCount}</span>
              </div>
            </div>
          </div>

          {/* Travel Data */}
          {(customer.passport_number || customer.nationality || customer.birth_date || customer.gender) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
                <Plane size={16} className="text-gold-500" /> بيانات السفر
              </h4>
              <div className="space-y-2.5">
                {[
                  { icon: CardIcon, label: 'رقم الجواز', value: customer.passport_number, dir: 'ltr' as const },
                  { icon: MapPin, label: 'الجنسية', value: customer.nationality },
                  { icon: Calendar, label: 'تاريخ الميلاد', value: customer.birth_date ? new Date(customer.birth_date).toLocaleDateString('ar-EG') : '' },
                  { icon: User, label: 'الجنس', value: customer.gender },
                  { icon: Calendar, label: 'إصدار الجواز', value: customer.passport_issue_date ? new Date(customer.passport_issue_date).toLocaleDateString('ar-EG') : '' },
                  { icon: Calendar, label: 'انتهاء الجواز', value: customer.passport_expiry_date ? new Date(customer.passport_expiry_date).toLocaleDateString('ar-EG') : '' },
                ].filter((r) => r.value).map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <r.icon size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-navy-800 mr-auto" dir={r.dir}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Change */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="text-sm font-bold text-navy-800 mb-4">تغيير حالة العميل</h4>
            <div className="grid grid-cols-2 gap-2">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${customer.status === s ? `${statusColors[s]} border` : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="xl:col-span-2 space-y-5">
          {/* Financial transactions */}
          {(payments.length > 0 || invoices.length > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-gold-500" /> سجل المعاملات المالية
              </h4>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={14} className="text-emerald-600" /></div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">دفعة — {p.payment_method}</p>
                        <p className="text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">{fmt(p.amount)} ج.م</span>
                  </div>
                ))}
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center"><FileText size={14} className="text-navy-600" /></div>
                      <div>
                        <p className="text-sm font-mono font-semibold text-navy-700">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{inv.service_type} · {inv.payment_status}</p>
                      </div>
                    </div>
                    <span className="font-bold text-navy-900 text-sm">{fmt(inv.total_amount)} ج.م</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookings */}
          {bookings.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
                <Package size={16} className="text-gold-500" /> الحجوزات ({bookings.length})
              </h4>
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{b.packages?.name ?? 'حجز'}</p>
                      <p className="text-xs text-gray-500">{new Date(b.booking_date).toLocaleDateString('ar-EG')} · {b.status}</p>
                    </div>
                    <div className="text-left">
                      <span className="badge text-xs bg-amber-100 text-amber-700">{b.payment_status}</span>
                      <p className="text-xs text-navy-700 font-semibold mt-0.5">{fmt(b.total_amount ?? 0)} ج.م</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operation Files */}
          {opFiles.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
                <FileCheck size={16} className="text-gold-500" /> ملفات التشغيل ({opFiles.length})
              </h4>
              <div className="space-y-2">
                {opFiles.map((op) => (
                  <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-mono font-semibold text-navy-700">{op.op_number}</p>
                      <p className="text-xs text-gray-500">{op.file_status}{op.travel_date ? ` · سفر: ${new Date(op.travel_date).toLocaleDateString('ar-EG')}` : ''}</p>
                    </div>
                    <span className={`badge text-xs ${op.financially_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {op.financially_approved ? 'معتمد مالياً' : 'بانتظار الاعتماد'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Follow-up */}
          {lastLog && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-gold-500" /> آخر متابعة
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'نوع التواصل', value: lastLog.type },
                  { label: 'التاريخ', value: new Date(lastLog.created_at).toLocaleDateString('ar-EG') },
                  { label: 'الموظف', value: lastLog.employees?.name || '—' },
                  { label: 'النتيجة', value: lastLog.result || '—' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-navy-800">{item.value}</p>
                  </div>
                ))}
              </div>
              {lastLog.notes && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
                  <p className="text-xs font-semibold text-blue-600 mb-1">ملخص التواصل</p>
                  <p className="text-sm text-gray-700">{lastLog.notes}</p>
                </div>
              )}
              {lastLog.next_follow_up && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1"><Calendar size={12} />موعد المتابعة القادمة</p>
                  <p className="text-sm font-bold text-gray-800">{new Date(lastLog.next_follow_up).toLocaleDateString('ar-EG')}</p>
                </div>
              )}
            </div>
          )}

          {/* Communication Log */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2">
                <MessageCircle size={16} className="text-gold-500" /> سجل التواصل ({logs.length})
              </h4>
              <button onClick={() => setShowAddLog(!showAddLog)} className="btn-gold text-xs py-2 px-3">
                <Plus size={14} /> إضافة تواصل
              </button>
            </div>

            {showAddLog && (
              <div className="bg-gray-50 rounded-2xl p-5 mb-5 border border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">نوع التواصل</label>
                    <select value={newLog.type} onChange={(e) => setNewLog({ ...newLog, type: e.target.value as CommType })} className="form-input">
                      <option>مكالمة</option><option>واتساب</option><option>زيارة</option><option>بريد إلكتروني</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">النتيجة</label>
                    <input value={newLog.result} onChange={(e) => setNewLog({ ...newLog, result: e.target.value })} className="form-input" placeholder="مثال: مهتم، لا يرد..." />
                  </div>
                </div>
                <div>
                  <label className="form-label">ملاحظات التواصل <span className="text-red-500">*</span></label>
                  <textarea value={newLog.notes} onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })} rows={2} className="form-input resize-none" placeholder="ملخص ما تم مناقشته..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">تم الاتفاق على</label>
                    <input value={newLog.agreed_on} onChange={(e) => setNewLog({ ...newLog, agreed_on: e.target.value })} className="form-input" placeholder="ما تم الاتفاق عليه..." />
                  </div>
                  <div>
                    <label className="form-label">موعد المتابعة القادمة</label>
                    <input type="datetime-local" value={newLog.next_follow_up} onChange={(e) => setNewLog({ ...newLog, next_follow_up: e.target.value })} className="form-input" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddLog(false)} className="btn-outline text-xs py-2 px-3">إلغاء</button>
                  <button onClick={addLog} disabled={saving} className="btn-gold text-xs py-2 px-3">{saving ? 'جارٍ الحفظ...' : 'حفظ التواصل'}</button>
                </div>
              </div>
            )}

            <div className="relative space-y-4">
              {logs.map((log, i) => {
                const Icon = commTypeIcons[log.type];
                return (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${commTypeColors[log.type]}`}>
                        <Icon size={16} />
                      </div>
                      {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-navy-800">{log.type}</span>
                          <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                        {log.notes && <p className="text-sm text-gray-700 mb-2">{log.notes}</p>}
                        {log.agreed_on && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5"><strong>تم الاتفاق:</strong> {log.agreed_on}</p>}
                        {log.next_follow_up && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-1"><strong>المتابعة:</strong> {new Date(log.next_follow_up).toLocaleDateString('ar-EG')}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا يوجد سجل تواصل بعد</p>
                </div>
              )}
            </div>
          </div>

          {/* Travel Checklist */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2">
                <PlaneIcon size={16} className="text-gold-500" /> Checklist السفر
              </h4>
              {(() => {
                const visaApproved = visaRecord?.visa_status === 'تمت الموافقة' || checklist?.visa_done;
                const visaUploaded = visaRecord?.visa_upload_status === 'Uploaded' || checklist?.visa_uploaded;
                const ready = checklist?.passport_done && visaApproved && visaUploaded && checklist?.ticket_done && checklist?.hotel_done && checklist?.invoice_done && checklist?.payment_done;
                return (
                  <span className={`badge text-xs ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {ready ? 'Ready to Travel' : 'غير جاهز'}
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'passport_done', label: 'جواز السفر' },
                { key: 'visa_approved', label: 'Visa Approved', derived: true, done: visaRecord?.visa_status === 'تمت الموافقة' || checklist?.visa_done },
                { key: 'visa_uploaded', label: 'Visa Uploaded', derived: true, done: visaRecord?.visa_upload_status === 'Uploaded' || checklist?.visa_uploaded },
                { key: 'ticket_done', label: 'التذكرة' },
                { key: 'hotel_done', label: 'الفندق' },
                { key: 'invoice_done', label: 'الفاتورة' },
                { key: 'payment_done', label: 'الدفع مكتمل' },
              ].map((item) => {
                const done = item.derived ? item.done : checklist?.[item.key as keyof ChecklistType] as boolean;
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-right ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-gray-300'}`}>
                      {done && <CheckCircle2 size={14} />}
                    </div>
                    <span className={`text-sm font-medium ${done ? 'text-emerald-700' : 'text-gray-600'}`}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Visa file display inside checklist */}
            {visaRecord?.visa_upload_status === 'Uploaded' && visaRecord.visa_file_path && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FileCheck size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {visaRecord.visa_id && <p className="text-xs font-mono font-bold text-navy-700">{visaRecord.visa_id}</p>}
                    {visaRecord.visa_number && <p className="text-xs text-gray-500">رقم التأشيرة: {visaRecord.visa_number}</p>}
                    <p className="text-sm font-semibold text-navy-900 truncate">{visaRecord.visa_file_name}</p>
                  </div>
                  <button
                    onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(visaRecord.visa_file_path!, 3600); if (data) window.open(data.signedUrl); }}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-500" title="معاينة"><Eye size={15} /></button>
                  <button
                    onClick={async () => { const { data } = await supabase.storage.from('documents').download(visaRecord.visa_file_path!); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = visaRecord.visa_file_name!; a.click(); } }}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-500" title="تحميل"><Download size={15} /></button>
                </div>
              </div>
            )}
          </div>


          {/* Workflow Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
              <GitCommit size={16} className="text-gold-500" /> سجل حركة المعاملة (Workflow)
            </h4>
            {workflowTimeline.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">لا توجد مراحل مسجلة</p>
            ) : (
              <div className="relative">
                {workflowTimeline.map((evt, i) => (
                  <div key={evt.id} className="flex gap-3 pb-5 last:pb-0 relative">
                    {i < workflowTimeline.length - 1 && (
                      <div className="absolute right-[15px] top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${evt.status === 'مكتمل' ? 'bg-emerald-500' : 'bg-amber-400'}`}>
                      <CheckCircle2 size={15} className="text-white" />
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <p className="text-sm font-bold text-navy-900">{evt.stage_label}</p>
                        <span className="text-xs text-gray-400">{new Date(evt.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {evt.department && <span className="badge bg-navy-50 text-navy-600 text-xs">{evt.department}</span>}
                        {evt.employee_name && <span className="flex items-center gap-1"><User size={10} /> {evt.employee_name}</span>}
                        <span className={`badge text-xs ${evt.status === 'مكتمل' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{evt.status}</span>
                      </div>
                      {evt.notes && <p className="text-xs text-gray-400 mt-1">{evt.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-navy-800 mb-5 flex items-center gap-2">
                <GitCommit size={16} className="text-gold-500" /> التايم لاين — تاريخ العميل
              </h4>
              <div className="relative">
                <div className="absolute right-4 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-4">
                  {timeline.map((ev, i) => {
                    const sourceColors: Record<string, string> = {
                      customer: 'bg-navy-100 text-navy-700',
                      inquiry: 'bg-blue-100 text-blue-700',
                      communication: 'bg-amber-100 text-amber-700',
                      booking: 'bg-emerald-100 text-emerald-700',
                      invoice: 'bg-cyan-100 text-cyan-700',
                      payment: 'bg-green-100 text-green-700',
                      document: 'bg-purple-100 text-purple-700',
                      operation: 'bg-gold-100 text-gold-700',
                    };
                    const color = sourceColors[ev.source] || 'bg-gray-100 text-gray-600';
                    return (
                      <div key={i} className="flex items-start gap-4 relative">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 z-10 ${color}`}>
                          <GitCommit size={14} />
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-sm font-semibold text-navy-900">{ev.event}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(ev.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <DocumentsSection customerId={customer.id} customerName={customer.name} />
        </div>
      </div>
    </div>
  );
}
