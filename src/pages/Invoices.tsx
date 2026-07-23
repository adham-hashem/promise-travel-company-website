import { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Printer, Download, Eye,
  Pencil, Trash2, X, CheckCircle, Clock, AlertCircle, Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Invoice, InvoicePaymentStatus, InvoiceServiceType, Customer, Hotel } from '../types';

const paymentStatusColors: Record<InvoicePaymentStatus, string> = {
  'غير مدفوع': 'bg-red-100 text-red-700 border-red-200',
  'مدفوع جزئياً': 'bg-amber-100 text-amber-700 border-amber-200',
  'مدفوع بالكامل': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const paymentStatusIcons: Record<InvoicePaymentStatus, React.ElementType> = {
  'غير مدفوع': AlertCircle,
  'مدفوع جزئياً': Clock,
  'مدفوع بالكامل': CheckCircle,
};

const SERVICE_TYPES: InvoiceServiceType[] = ['حج', 'عمرة', 'رحلة داخلية', 'أخرى'];



function generateInvoicePlaceholder(): string {
  return 'سيتم التوليد تلقائياً';
}

interface InvoiceModalProps {
  invoice?: Invoice | null;
  customers: Customer[];
  hotels: Hotel[];
  onClose: () => void;
  onSave: () => void;
}

function InvoiceModal({ invoice, customers, hotels, onClose, onSave }: InvoiceModalProps) {
  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number ?? generateInvoicePlaceholder(),
    client_code: invoice?.customers?.client_code ?? '',
    customer_id: invoice?.customer_id ?? '',
    hotel_id: invoice?.hotel_id ?? '',
    service_type: invoice?.service_type ?? ('عمرة' as InvoiceServiceType),
    package_name: invoice?.package_name ?? '',
    total_amount: invoice?.total_amount ?? 0,
    paid_amount: invoice?.paid_amount ?? 0,
    notes: invoice?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [subCode, setSubCode] = useState<string | null>(invoice?.invoice_number ?? null);

  // Generate sub-code when customer changes
  const onCustomerChange = async (customerId: string) => {
    setForm(p => ({ ...p, customer_id: customerId }));
    if (customerId) {
      const { data: cust } = await supabase.from('customers').select('client_code').eq('id', customerId).maybeSingle();
      if (cust?.client_code) {
        const { data: code } = await supabase.rpc('generate_sub_code', { p_client_code: cust.client_code, p_prefix: 'INV' });
        setSubCode(code as string);
      } else { setSubCode(null); }
    } else { setSubCode(null); }
  };

  const remaining = form.total_amount - form.paid_amount;
  const paymentStatus: InvoicePaymentStatus =
    form.paid_amount <= 0 ? 'غير مدفوع' :
    form.paid_amount >= form.total_amount ? 'مدفوع بالكامل' : 'مدفوع جزئياً';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      invoice_number: subCode || form.invoice_number,
      payment_status: paymentStatus,
      customer_id: form.customer_id || null,
      hotel_id: form.hotel_id || null,
      updated_at: new Date().toISOString(),
    };
    if (invoice) {
      await supabase.from('invoices').update(payload).eq('id', invoice.id);
    } else {
      await supabase.from('invoices').insert([payload]);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-navy-900">{invoice ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الفاتورة</label>
              <input className="input-field bg-gray-50 font-mono text-gold-700 font-semibold" readOnly value={subCode || form.invoice_number} />
              {form.client_code && <p className="text-xs text-gray-400 mt-1">مرتبط بـ: <span className="font-mono font-semibold">{form.client_code}</span></p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخدمة</label>
              <select className="input-field" value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value as InvoiceServiceType }))}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
              <select className="input-field" value={form.customer_id} onChange={e => onCustomerChange(e.target.value)}>
                <option value="">اختر العميل</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}{c.client_code ? ` (${c.client_code})` : ''}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الباقة / الخدمة</label>
              <input className="input-field" value={form.package_name} onChange={e => setForm(p => ({ ...p, package_name: e.target.value }))} placeholder="اسم الباقة أو الخدمة المقدمة" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفندق (اختياري)</label>
              <select className="input-field" value={form.hotel_id} onChange={e => setForm(p => ({ ...p, hotel_id: e.target.value }))}>
                <option value="">بدون فندق</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name} - {h.city}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إجمالي المبلغ (ج.م)</label>
              <input type="number" className="input-field" min="0" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المدفوع (ج.م)</label>
              <input type="number" className="input-field" min="0" max={form.total_amount} value={form.paid_amount} onChange={e => setForm(p => ({ ...p, paid_amount: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المتبقي</label>
              <div className={`input-field font-bold ${remaining > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                {remaining.toLocaleString('ar-EG')} ج.م
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">الإجمالي:</span>
              <span className="font-bold text-navy-900">{form.total_amount.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المدفوع:</span>
              <span className="font-bold text-emerald-600">{form.paid_amount.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المتبقي:</span>
              <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{remaining.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">حالة الدفع:</span>
              <span className={`badge border text-xs ${paymentStatusColors[paymentStatus]}`}>{paymentStatus}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات إضافية" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-gold flex-1 justify-center">
              {saving ? 'جارٍ الحفظ...' : invoice ? 'حفظ التعديلات' : 'إنشاء الفاتورة'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
}

function InvoiceDetailModal({ invoice, onClose, onEdit, onDelete, onPrint }: InvoiceDetailModalProps) {
  const remaining = invoice.total_amount - invoice.paid_amount;
  const StatusIcon = paymentStatusIcons[invoice.payment_status];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-navy-900">تفاصيل الفاتورة</h2>
            <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Customer info */}
          {invoice.customers && (
            <div className="bg-navy-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-navy-500 mb-2 uppercase tracking-wider">بيانات العميل</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center text-white font-bold">
                  {invoice.customers.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-navy-900">{invoice.customers.name}</p>
                  <p className="text-sm text-navy-600 flex items-center gap-1" dir="ltr"><Phone size={12} />{invoice.customers.phone}</p>
                  {invoice.customers.client_code && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-navy-700 rounded-lg text-xs font-mono font-semibold border border-navy-200 mt-1">
                      {invoice.customers.client_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Service details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">تفاصيل الخدمة</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">نوع الخدمة</p>
                <p className="font-semibold text-navy-900">{invoice.service_type}</p>
              </div>
              {invoice.package_name && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">الباقة</p>
                  <p className="font-semibold text-navy-900">{invoice.package_name}</p>
                </div>
              )}
              {invoice.hotels && (
                <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">الفندق</p>
                  <p className="font-semibold text-navy-900">{invoice.hotels.name} - {invoice.hotels.city}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">تفاصيل الدفع</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">الإجمالي</span>
                <span className="font-bold text-navy-900 text-lg">{invoice.total_amount.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">المدفوع</span>
                <span className="font-bold text-emerald-600">{invoice.paid_amount.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, (invoice.paid_amount / invoice.total_amount) * 100)}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">المتبقي</span>
                <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{remaining.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="text-gray-600 text-sm">حالة الدفع</span>
                <span className={`badge border text-xs flex items-center gap-1 ${paymentStatusColors[invoice.payment_status]}`}>
                  <StatusIcon size={11} />{invoice.payment_status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onPrint} className="btn-gold justify-center"><Printer size={15} />طباعة</button>
            <button onClick={onPrint} className="btn-secondary justify-center"><Download size={15} />تحميل PDF</button>
            {true && <button onClick={onEdit} className="btn-secondary justify-center col-span-1"><Pencil size={15} />تعديل</button>}
            {true && <button onClick={onDelete} className="flex items-center gap-2 justify-center px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"><Trash2 size={15} />حذف</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const { can } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoicePaymentStatus | 'الكل'>('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const load = async () => {
    setLoading(true);
    const [invRes, custRes, hotelRes] = await Promise.all([
      supabase.from('invoices').select('*, customers(*), hotels(*)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, phone').order('name'),
      supabase.from('hotels').select('id, name, city').eq('status', 'نشط'),
    ]);
    setInvoices((invRes.data as Invoice[]) || []);
    setCustomers((custRes.data as unknown as Customer[]) ?? []);
    setHotels((hotelRes.data as unknown as Hotel[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    setDetailInvoice(null);
    await supabase.from('invoices').delete().eq('id', id);
    load();
  };

  const handlePrint = () => {
    if (!detailInvoice) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const inv = detailInvoice;
    win.document.write(`
      <html dir="rtl"><head><title>فاتورة ${inv.invoice_number}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 28px; font-weight: bold; color: #1e3a5f; }
        .inv-num { font-size: 16px; color: #64748b; margin-top: 5px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .label { color: #64748b; }
        .value { font-weight: 600; color: #1e293b; }
        .total-row { font-size: 18px; font-weight: bold; padding: 12px 0; border-top: 2px solid #1e3a5f; }
        .remaining { color: ${(inv.total_amount - inv.paid_amount) > 0 ? '#dc2626' : '#16a34a'}; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .status-paid { background: #dcfce7; color: #16a34a; }
        .status-partial { background: #fef9c3; color: #ca8a04; }
        .status-unpaid { background: #fee2e2; color: #dc2626; }
      </style></head><body>
      <div class="header">
        <div class="title">PROMISE - فاتورة</div>
        <div class="inv-num">${inv.invoice_number} | ${new Date(inv.created_at).toLocaleDateString('ar-EG')}</div>
      </div>
      ${inv.customers ? `<div class="section"><div class="section-title">بيانات العميل</div>
        ${inv.customers.client_code ? `<div class="row"><span class="label">كود العميل</span><span class="value" style="font-family:monospace;color:#1e3a5f;font-weight:bold">${inv.customers.client_code}</span></div>` : ''}
        <div class="row"><span class="label">الاسم</span><span class="value">${inv.customers.name}</span></div>
        <div class="row"><span class="label">الهاتف</span><span class="value" dir="ltr">${inv.customers.phone}</span></div>
      </div>` : ''}
      <div class="section"><div class="section-title">تفاصيل الخدمة</div>
        <div class="row"><span class="label">نوع الخدمة</span><span class="value">${inv.service_type}</span></div>
        ${inv.package_name ? `<div class="row"><span class="label">الباقة</span><span class="value">${inv.package_name}</span></div>` : ''}
        ${inv.hotels ? `<div class="row"><span class="label">الفندق</span><span class="value">${inv.hotels.name}</span></div>` : ''}
      </div>
      <div class="section"><div class="section-title">تفاصيل الدفع</div>
        <div class="row"><span class="label">الإجمالي</span><span class="value">${inv.total_amount.toLocaleString('ar-EG')} ج.م</span></div>
        <div class="row"><span class="label">المدفوع</span><span class="value" style="color:#16a34a">${inv.paid_amount.toLocaleString('ar-EG')} ج.م</span></div>
        <div class="row total-row"><span class="label">المتبقي</span><span class="value remaining">${(inv.total_amount - inv.paid_amount).toLocaleString('ar-EG')} ج.م</span></div>
        <div class="row"><span class="label">حالة الدفع</span><span class="value"><span class="badge ${inv.payment_status === 'مدفوع بالكامل' ? 'status-paid' : inv.payment_status === 'مدفوع جزئياً' ? 'status-partial' : 'status-unpaid'}">${inv.payment_status}</span></span></div>
      </div>
      <script>window.print();<\/script></body></html>`);
    win.document.close();
  };

  const filtered = invoices.filter(inv => {
    const customerName = inv.customers?.name ?? '';
    const matchSearch = !search || inv.invoice_number.includes(search) || customerName.includes(search);
    const matchStatus = filterStatus === 'الكل' || inv.payment_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => i.payment_status === 'غير مدفوع').length,
    partial: invoices.filter(i => i.payment_status === 'مدفوع جزئياً').length,
    paid: invoices.filter(i => i.payment_status === 'مدفوع بالكامل').length,
    totalAmount: invoices.reduce((s, i) => s + i.total_amount, 0),
    paidAmount: invoices.reduce((s, i) => s + i.paid_amount, 0),
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">الفواتير</h1>
          <p className="text-gray-500 text-sm mt-0.5">إدارة وطباعة فواتير العملاء</p>
        </div>
        {can('invoices_add') && (
          <button onClick={() => { setEditInvoice(null); setShowModal(true); }} className="btn-gold">
            <Plus size={18} /> إنشاء فاتورة
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الفواتير', value: stats.total, icon: FileText, color: 'text-navy-600', bg: 'bg-navy-50' },
          { label: 'غير مدفوع', value: stats.unpaid, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'مدفوع جزئياً', value: stats.partial, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مدفوع بالكامل', value: stats.paid, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">إجمالي الفواتير</p>
          <p className="text-2xl font-bold text-navy-900">{stats.totalAmount.toLocaleString('ar-EG')} <span className="text-sm font-normal text-gray-500">ج.م</span></p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">إجمالي المحصل</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.paidAmount.toLocaleString('ar-EG')} <span className="text-sm font-normal text-gray-500">ج.م</span></p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.totalAmount ? (stats.paidAmount / stats.totalAmount) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pr-9 py-2 text-sm" placeholder="بحث برقم الفاتورة أو اسم العميل..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['الكل', 'غير مدفوع', 'مدفوع جزئياً', 'مدفوع بالكامل'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filterStatus === s ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">سجل الفواتير</h2>
          <span className="text-sm text-gray-500">{filtered.length} فاتورة</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد فواتير مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-right">
                  {['رقم الفاتورة', 'العميل', 'الخدمة', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => {
                  const remaining = inv.total_amount - inv.paid_amount;
                  const StatusIcon = paymentStatusIcons[inv.payment_status];
                  return (
                    <tr key={inv.id} className="hover:bg-navy-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-navy-700 text-sm">{inv.invoice_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.customers ? (
                          <div>
                            <p className="font-semibold text-navy-900 text-sm">{inv.customers.name}</p>
                            <p className="text-xs text-gray-500" dir="ltr">{inv.customers.phone}</p>
                          </div>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{inv.service_type}</p>
                          {inv.package_name && <p className="text-xs text-gray-400">{inv.package_name}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-navy-900 text-sm">{inv.total_amount.toLocaleString('ar-EG')}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 text-sm">{inv.paid_amount.toLocaleString('ar-EG')}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{remaining.toLocaleString('ar-EG')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge border text-xs flex items-center gap-1 w-fit ${paymentStatusColors[inv.payment_status]}`}>
                          <StatusIcon size={11} />{inv.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailInvoice(inv)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-navy-700"><Eye size={15} /></button>
                          {can('invoices_edit') && (
                            <button onClick={() => { setEditInvoice(inv); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-500 hover:text-blue-600"><Pencil size={15} /></button>
                          )}
                          {can('invoices_delete') && (
                            <button onClick={() => handleDelete(inv.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"><Trash2 size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <InvoiceModal
          invoice={editInvoice}
          customers={customers}
          hotels={hotels}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onEdit={() => { setEditInvoice(detailInvoice); setDetailInvoice(null); setShowModal(true); }}
          onDelete={() => handleDelete(detailInvoice.id)}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
