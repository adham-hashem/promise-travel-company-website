import { useEffect, useState, useRef } from 'react';
import {
  Plus, X, Loader2, Search, Plane, FileText,
  Trash2, Download, Upload, Eye, CheckCircle2, AlertCircle,
  Clock, XCircle, FileCheck, Wallet, User,
  Globe,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Visa, VisaStatus, VisaType, VisaDocument, VisaDocType, Customer, Employee, Page } from '../types';

const visaStatuses: VisaStatus[] = ['لم يبدأ', 'قيد التقديم', 'قيد المراجعة', 'تمت الموافقة', 'مرفوضة', 'منتهية'];
const visaTypes: VisaType[] = ['عمرة', 'حج', 'سياحة', 'عمل', 'علاج', 'أخرى'];
const docTypes: VisaDocType[] = ['جواز السفر', 'صورة شخصية', 'تأمين', 'حجز طيران', 'حجز فندق', 'مستندات إضافية'];

const statusConfig: Record<VisaStatus, { color: string; bg: string; icon: React.ElementType }> = {
  'لم يبدأ': { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  'قيد التقديم': { color: 'text-blue-700', bg: 'bg-blue-100', icon: FileText },
  'قيد المراجعة': { color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertCircle },
  'تمت الموافقة': { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  'مرفوضة': { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  'منتهية': { color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
};

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function VisaManagement({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Visa | null>(null);
  const [form, setForm] = useState({
    customer_id: '', full_name: '', service_type: 'عمرة', visa_type: 'عمرة' as VisaType,
    country: 'السعودية', application_date: '', issue_date: '', expiry_date: '',
    visa_fee: '', assigned_employee_id: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [visaDocs, setVisaDocs] = useState<VisaDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState<VisaDocType>('جواز السفر');
  const [visaFileUploading, setVisaFileUploading] = useState(false);
  const [visaNumber, setVisaNumber] = useState('');
  const visaFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
    supabase.from('employees').select('id, name, role').eq('is_active', true).then(({ data }) => {
      if (data) setEmployees(data as Employee[]);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    const [visaRes, custRes] = await Promise.all([
      supabase.from('visa_management').select('*, employees(id, name), customers(id, name, phone, client_code)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, phone, client_code, service_type').order('name'),
    ]);
    setVisas((visaRes.data as Visa[]) || []);
    setCustomers((custRes.data as Customer[]) || []);
    setLoading(false);
  };

  const filtered = visas.filter((v) => {
    if (filterStatus && v.visa_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.full_name.toLowerCase().includes(q) && !(v.visa_id || '').toLowerCase().includes(q) && !(v.client_code || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: visas.length,
    notStarted: visas.filter((v) => v.visa_status === 'لم يبدأ').length,
    inProgress: visas.filter((v) => v.visa_status === 'قيد التقديم' || v.visa_status === 'قيد المراجعة').length,
    approved: visas.filter((v) => v.visa_status === 'تمت الموافقة').length,
    rejected: visas.filter((v) => v.visa_status === 'مرفوضة').length,
    expired: visas.filter((v) => v.visa_status === 'منتهية').length,
  };

  const onCustomerSelect = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setForm({ ...form, customer_id: id, full_name: cust?.name || '', service_type: cust?.service_type || 'عمرة' });
  };

  const createVisa = async () => {
    if (!form.customer_id || !form.full_name.trim()) return;
    setSaving(true);
    const cust = customers.find((c) => c.id === form.customer_id);
    const { data } = await supabase
      .from('visa_management')
      .insert({
        client_code: cust?.client_code || null,
        customer_id: form.customer_id,
        full_name: form.full_name,
        service_type: form.service_type,
        visa_type: form.visa_type,
        country: form.country,
        application_date: form.application_date || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        visa_fee: parseFloat(form.visa_fee) || 0,
        visa_status: 'لم يبدأ',
        assigned_employee_id: form.assigned_employee_id || null,
        notes: form.notes || null,
      })
      .select('*, employees(id, name), customers(id, name, phone, client_code)')
      .single();
    if (data) {
      setVisas([data as Visa, ...visas]);
      // Auto-create travel checklist for the customer
      await supabase.from('travel_checklist').upsert({ customer_id: form.customer_id }, { onConflict: 'customer_id' }).eq('customer_id', form.customer_id);
    }
    setForm({ customer_id: '', full_name: '', service_type: 'عمرة', visa_type: 'عمرة', country: 'السعودية', application_date: '', issue_date: '', expiry_date: '', visa_fee: '', assigned_employee_id: '', notes: '' });
    setShowForm(false);
    setSaving(false);
  };

  const updateStatus = async (visa: Visa, status: VisaStatus) => {
    const { data } = await supabase.from('visa_management').update({ visa_status: status }).eq('id', visa.id).select('*, employees(id, name), customers(id, name, phone, client_code)').single();
    if (data) {
      setVisas(visas.map((v) => (v.id === visa.id ? (data as Visa) : v)));
      if (selected?.id === visa.id) setSelected(data as Visa);
    }
  };

  const deleteVisa = async (id: string) => {
    await supabase.from('visa_management').delete().eq('id', id);
    setVisas(visas.filter((v) => v.id !== id));
    setSelected(null);
  };

  const openVisa = async (v: Visa) => {
    setSelected(v);
    setVisaNumber(v.visa_number || '');
    const { data } = await supabase.from('visa_documents').select('*').eq('visa_id', v.id).order('created_at', { ascending: false });
    setVisaDocs((data as VisaDocument[]) || []);
  };

  const uploadDoc = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    const filePath = `visa-docs/${selected.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setUploading(false); return; }
    const { data } = await supabase
      .from('visa_documents')
      .insert({ visa_id: selected.id, doc_type: uploadDocType, file_path: filePath, file_name: file.name, file_size: file.size, status: 'مرفوع' })
      .select('*')
      .single();
    if (data) setVisaDocs([data as VisaDocument, ...visaDocs]);
    setUploading(false);
  };

  const deleteDoc = async (doc: VisaDocument) => {
    await supabase.storage.from('documents').remove([doc.file_path]);
    await supabase.from('visa_documents').delete().eq('id', doc.id);
    setVisaDocs(visaDocs.filter((d) => d.id !== doc.id));
  };

  const uploadVisaFile = async (file: File) => {
    if (!selected) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('الملفات المدعومة: PDF, JPG, PNG فقط');
      return;
    }
    setVisaFileUploading(true);
    const filePath = `visa-files/${selected.id}/visa-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setVisaFileUploading(false); return; }
    const { data } = await supabase
      .from('visa_management')
      .update({
        visa_number: visaNumber || null,
        visa_file_path: filePath,
        visa_file_name: file.name,
        visa_upload_status: 'Uploaded',
        visa_file_uploaded_at: new Date().toISOString(),
        visa_file_uploaded_by: profile?.id || null,
      })
      .eq('id', selected.id)
      .select('*, employees(id, name), customers(id, name, phone, client_code)')
      .single();
    if (data) {
      const updated = data as Visa;
      setVisas(visas.map((v) => (v.id === updated.id ? updated : v)));
      setSelected(updated);
    }
    setVisaFileUploading(false);
  };

  const deleteVisaFile = async () => {
    if (!selected || !selected.visa_file_path) return;
    await supabase.storage.from('documents').remove([selected.visa_file_path]);
    const { data } = await supabase
      .from('visa_management')
      .update({
        visa_number: null,
        visa_file_path: null,
        visa_file_name: null,
        visa_upload_status: 'Not Uploaded',
        visa_file_uploaded_at: null,
      })
      .eq('id', selected.id)
      .select('*, employees(id, name), customers(id, name, phone, client_code)')
      .single();
    if (data) {
      const updated = data as Visa;
      setVisas(visas.map((v) => (v.id === updated.id ? updated : v)));
      setSelected(updated);
    }
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');
  const docIcons: Record<VisaDocType, React.ElementType> = {
    'جواز السفر': FileCheck, 'صورة شخصية': User, 'تأمين': CheckCircle2,
    'حجز طيران': Plane, 'حجز فندق': Globe, 'مستندات إضافية': FileText,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">إدارة التأشيرات</h2>
          <p className="section-subtitle">متابعة التأشيرات من الاستعلام حتى السفر</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">
          <Plus size={16} /> ملف تأشيرة جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'الكل', value: stats.total, cfg: statusConfig['لم يبدأ'] },
          { label: 'لم يبدأ', value: stats.notStarted, cfg: statusConfig['لم يبدأ'] },
          { label: 'قيد التنفيذ', value: stats.inProgress, cfg: statusConfig['قيد التقديم'] },
          { label: 'تمت الموافقة', value: stats.approved, cfg: statusConfig['تمت الموافقة'] },
          { label: 'مرفوضة', value: stats.rejected, cfg: statusConfig['مرفوضة'] },
          { label: 'منتهية', value: stats.expired, cfg: statusConfig['منتهية'] },
        ].map((s) => {
          const Icon = s.cfg.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className={`w-9 h-9 rounded-xl ${s.cfg.bg} flex items-center justify-center mb-1.5`}>
                <Icon size={16} className={s.cfg.color} />
              </div>
              <p className="text-xl font-black text-navy-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بـ Client Code، Visa ID، أو اسم العميل..." className="form-input pr-9" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-input sm:w-44">
          <option value="">كل الحالات</option>
          {visaStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-800">إنشاء ملف تأشيرة جديد</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">العميل <span className="text-red-500">*</span></label>
              <select value={form.customer_id} onChange={(e) => onCustomerSelect(e.target.value)} className="form-input">
                <option value="">— اختر العميل —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.client_code ? `(${c.client_code})` : ''}</option>)}
              </select>
            </div>
            <div><label className="form-label">اسم العميل</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">نوع الخدمة</label><input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="form-input" /></div>
            <div>
              <label className="form-label">نوع التأشيرة</label>
              <select value={form.visa_type} onChange={(e) => setForm({ ...form, visa_type: e.target.value as VisaType })} className="form-input">
                {visaTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="form-label">الدولة</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">تاريخ التقديم</label><input type="date" value={form.application_date} onChange={(e) => setForm({ ...form, application_date: e.target.value })} className="form-input" dir="ltr" /></div>
            <div><label className="form-label">تاريخ الإصدار</label><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="form-input" dir="ltr" /></div>
            <div><label className="form-label">تاريخ الانتهاء</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="form-input" dir="ltr" /></div>
            <div><label className="form-label">رسوم التأشيرة (ج.م)</label><input type="number" value={form.visa_fee} onChange={(e) => setForm({ ...form, visa_fee: e.target.value })} className="form-input" placeholder="0" /></div>
            <div>
              <label className="form-label">الموظف المسؤول</label>
              <select value={form.assigned_employee_id} onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })} className="form-input">
                <option value="">— غير محدد —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><label className="form-label">ملاحظات</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="form-input resize-none" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-outline text-xs py-2 px-4">إلغاء</button>
            <button onClick={createVisa} disabled={!form.customer_id || saving} className="btn-gold text-xs py-2 px-4">{saving ? 'جارٍ الحفظ...' : 'إنشاء الملف'}</button>
          </div>
        </div>
      )}

      {/* Visa list */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <Plane size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد ملفات تأشيرات</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  {['Visa ID', 'العميل', 'Client Code', 'النوع', 'الدولة', 'الرسوم', 'الحالة', 'الموظف', 'إجراءات'].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => {
                  const cfg = statusConfig[v.visa_status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openVisa(v)}>
                      <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-gold-700">{v.visa_id || '—'}</span></td>
                      <td className="px-4 py-3 font-semibold text-navy-900">{v.full_name}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-navy-600">{v.client_code || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-600">{v.visa_type}</td>
                      <td className="px-4 py-3 text-gray-600">{v.country}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">{fmt(v.visa_fee)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs flex items-center gap-1 w-fit ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon size={11} />{v.visa_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.employees?.name || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openVisa(v)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Eye size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visa detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-navy p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><Plane size={22} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{selected.full_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selected.visa_id && <span className="font-mono text-xs text-gold-300">{selected.visa_id}</span>}
                      {selected.client_code && <span className="font-mono text-xs text-white/60">{selected.client_code}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Status update */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-600">الحالة:</span>
                {visaStatuses.map((s) => {
                  const cfg = statusConfig[s];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${selected.visa_status === s ? `${cfg.bg} ${cfg.color} border-transparent` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      <Icon size={11} />{s}
                    </button>
                  );
                })}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'نوع التأشيرة', value: selected.visa_type },
                  { label: 'الدولة', value: selected.country },
                  { label: 'نوع الخدمة', value: selected.service_type },
                  { label: 'تاريخ التقديم', value: selected.application_date ? new Date(selected.application_date).toLocaleDateString('ar-EG') : '—' },
                  { label: 'تاريخ الإصدار', value: selected.issue_date ? new Date(selected.issue_date).toLocaleDateString('ar-EG') : '—' },
                  { label: 'تاريخ الانتهاء', value: selected.expiry_date ? new Date(selected.expiry_date).toLocaleDateString('ar-EG') : '—' },
                  { label: 'رسوم التأشيرة', value: `${fmt(selected.visa_fee)} ج.م` },
                  { label: 'الموظف', value: selected.employees?.name || '—' },
                ].map((r) => (
                  <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{r.label}</p>
                    <p className="text-sm font-semibold text-navy-900">{r.value}</p>
                  </div>
                ))}
              </div>

              {selected.notes && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">ملاحظات</p><p className="text-sm text-gray-700">{selected.notes}</p></div>}

              {/* Visa fee payment button */}
              <button
                onClick={async () => {
                  if (!selected.customer_id) return;
                  const cust = selected.customers || customers.find((c) => c.id === selected.customer_id);
                  let txnNumber: string | null = null;
                  if (cust?.client_code) {
                    const { data: code } = await supabase.rpc('generate_sub_code', { p_client_code: cust.client_code, p_prefix: 'TXN' });
                    txnNumber = code as string;
                  }
                  await supabase.from('payments').insert({
                    customer_id: selected.customer_id,
                    amount: selected.visa_fee,
                    payment_method: 'كاش',
                    payment_date: new Date().toISOString().split('T')[0],
                    status: 'مدفوع بالكامل',
                    notes: `رسوم تأشيرة - ${selected.visa_id}`,
                    transaction_number: txnNumber,
                  });
                  alert('تم تسجيل رسوم التأشيرة في الحسابات');
                }}
                className="w-full btn-outline text-sm py-2.5 flex items-center justify-center gap-2"
              >
                <Wallet size={15} className="text-emerald-600" /> تسجيل رسوم التأشيرة في الحسابات ({fmt(selected.visa_fee)} ج.م)
              </button>

              {/* Visa File Upload Section */}
              <div className="bg-gradient-to-l from-navy-50 to-white rounded-2xl border border-navy-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2">
                    <FileCheck size={16} className="text-gold-500" /> ملف التأشيرة الفعلي
                  </h4>
                  <span className={`badge text-xs flex items-center gap-1 ${selected.visa_upload_status === 'Uploaded' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {selected.visa_upload_status === 'Uploaded' ? <><CheckCircle2 size={11} /> Uploaded</> : <>Not Uploaded</>}
                  </span>
                </div>

                {selected.visa_upload_status === 'Uploaded' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {selected.visa_number && <p className="text-xs font-mono font-bold text-navy-700 mb-0.5">رقم التأشيرة: {selected.visa_number}</p>}
                        <p className="text-sm font-semibold text-navy-900 truncate">{selected.visa_file_name}</p>
                        {selected.visa_file_uploaded_at && <p className="text-xs text-gray-400">رفع: {new Date(selected.visa_file_uploaded_at).toLocaleDateString('ar-EG')}</p>}
                      </div>
                      <button
                        onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(selected.visa_file_path!, 3600); if (data) window.open(data.signedUrl); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="معاينة"><Eye size={16} /></button>
                      <button
                        onClick={async () => { const { data } = await supabase.storage.from('documents').download(selected.visa_file_path!); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = selected.visa_file_name!; a.click(); } }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="تحميل"><Download size={16} /></button>
                      <button onClick={() => visaFileRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-lg text-blue-500" title="استبدال"><Upload size={16} /></button>
                      <button onClick={deleteVisaFile} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="حذف"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">رقم التأشيرة (اختياري)</label>
                      <input value={visaNumber} onChange={(e) => setVisaNumber(e.target.value)} className="form-input" placeholder="أدخل رقم التأشيرة بعد إصدارها" />
                    </div>
                    <button
                      onClick={() => visaFileRef.current?.click()}
                      disabled={visaFileUploading}
                      className="w-full border-2 border-dashed border-gray-300 hover:border-navy-400 rounded-xl py-8 flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                      {visaFileUploading ? <Loader2 size={24} className="animate-spin text-navy-600" /> : <><Upload size={24} className="text-gray-400" /><p className="text-sm text-gray-500">اضغط لرفع ملف التأشيرة</p><p className="text-xs text-gray-400">PDF · JPG · PNG</p></>}
                    </button>
                  </div>
                )}
                <input
                  ref={visaFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVisaFile(f); e.target.value = ''; }}
                />
              </div>

              {/* Documents section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2"><FileText size={15} className="text-gold-500" /> مستندات التأشيرة</h4>
                  <div className="flex items-center gap-2">
                    <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value as VisaDocType)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                      {docTypes.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-gold text-xs py-1.5 px-3">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> رفع</>}
                    </button>
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }} />
                  </div>
                </div>
                {visaDocs.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">لا توجد مستندات مرفوعة</p>
                ) : (
                  <div className="space-y-2">
                    {visaDocs.map((doc) => {
                      const DocIcon = docIcons[doc.doc_type] || FileText;
                      return (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center"><DocIcon size={16} className="text-navy-700" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy-900">{doc.doc_type}</p>
                            <p className="text-xs text-gray-500 truncate">{doc.file_name}</p>
                          </div>
                          <button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600); if (data) window.open(data.signedUrl); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500" title="معاينة"><Eye size={14} /></button>
                          <button onClick={async () => { const { data } = await supabase.storage.from('documents').download(doc.file_path); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = doc.file_name; a.click(); } }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500" title="تحميل"><Download size={14} /></button>
                          <button onClick={() => deleteDoc(doc)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="حذف"><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                {selected.customer_id && (
                  <button onClick={() => onNavigate('customer-details', selected.customer_id)} className="text-xs text-navy-600 font-semibold hover:underline">عرض ملف العميل ←</button>
                )}
                <button onClick={() => deleteVisa(selected.id)} className="text-xs text-red-500 font-semibold hover:underline">حذف ملف التأشيرة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
