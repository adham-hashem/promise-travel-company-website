import { useEffect, useState, useRef } from 'react';
import {
  FileCheck, Search, Loader2, Hash, User, Plane, Hotel as HotelIcon,
  Calendar, CheckCircle2, AlertCircle, FileText, CreditCard, Wallet,
  Download, Eye, ChevronRight, Globe, Clock, X, Upload,
  Trash2, UserCheck, Flag, Users, MessageSquare, Phone, Mail,
  Package, Shield, FilePlus, Briefcase,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OpDoc {
  id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

interface OpFile {
  id: string;
  op_number: string | null;
  file_status: string;
  travel_date: string | null;
  return_date: string | null;
  financially_approved: boolean;
  visa_status?: string;
  visa_upload_status?: string;
  workflow_stage?: string;
  notes: string | null;
  assigned_to?: string | null;
  priority?: string;
  pax_count?: number;
  special_requests?: string | null;
  created_at: string;
  customer: { id: string; name: string; client_code: string | null; phone: string; email: string | null; documents_status: string | null } | null;
  booking: { id: string; status: string; payment_status: string; total_amount: number | null; paid_amount: number | null; package_name: string | null; source: string | null; destination: string | null; pax_count: number | null } | null;
  hotel: { name: string; city: string } | null;
  assigned_employee?: { id: string; name: string } | null;
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  'جديد': { color: 'text-blue-700', bg: 'bg-blue-100' },
  'قيد التجهيز': { color: 'text-amber-700', bg: 'bg-amber-100' },
  'مستندات ناقصة': { color: 'text-red-700', bg: 'bg-red-100' },
  'جاهز للسفر': { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'مكتمل': { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'مغلق': { color: 'text-gray-600', bg: 'bg-gray-200' },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  'عاجلة': { color: 'text-red-700', bg: 'bg-red-100' },
  'عادية': { color: 'text-blue-700', bg: 'bg-blue-100' },
  'منخفضة': { color: 'text-gray-600', bg: 'bg-gray-100' },
};

const workflowStages = [
  { key: 'new', label: 'جديد', icon: FileCheck },
  { key: 'accounts', label: 'الحسابات', icon: Wallet },
  { key: 'operations', label: 'التشغيل', icon: Briefcase },
  { key: 'visa', label: 'التأشيرة', icon: Shield },
  { key: 'flight', label: 'الطيران', icon: Plane },
  { key: 'ready', label: 'جاهز للسفر', icon: CheckCircle2 },
  { key: 'completed', label: 'مكتمل', icon: CheckCircle2 },
];

const opDocTypes = ['تذكرة مؤكدة', 'فاوتشر فندق', 'فاوتشر نقل', 'تأمين سفر', 'نسخة التأشيرة', 'برنامج الرحلة', 'مستند إضافي'];

const fileStatusOptions = ['جديد', 'قيد التجهيز', 'مستندات ناقصة', 'جاهز للسفر', 'مكتمل', 'مغلق'];

interface Props {
  onNavigate?: (page: string, id?: string) => void;
}

export default function OperationsDashboard({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<OpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, ready: 0, incomplete: 0, inProgress: 0, flight: 0 });
  const [selected, setSelected] = useState<OpFile | null>(null);
  const [opDocs, setOpDocs] = useState<OpDoc[]>([]);
  const [customerDocs, setCustomerDocs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState(opDocTypes[0]);
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFlightTransferModal, setShowFlightTransferModal] = useState(false);
  const [targetFlightEmpId, setTargetFlightEmpId] = useState('');
  const [flightTransferNotes, setFlightTransferNotes] = useState('');
  const [flightTransferring, setFlightTransferring] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
    loadEmployees();
  }, []);

  const handleSendToFlight = async () => {
    if (!selected) return;
    setFlightTransferring(true);
    const updatedNotes = flightTransferNotes
      ? `${selected.notes ? selected.notes + ' | ' : ''}ملاحظات قسم التشغيل للطيران: ${flightTransferNotes}`
      : selected.notes;

    const updates = {
      workflow_stage: 'flight',
      assigned_to: targetFlightEmpId || selected.assigned_to,
      notes: updatedNotes,
    };

    const { data } = await supabase
      .from('operation_files')
      .update(updates)
      .eq('id', selected.id)
      .select(`
        *,
        customer:customers(*),
        booking:bookings(*),
        hotel:hotels(*),
        assigned_employee:employees!operation_files_assigned_to_fkey(id, name)
      `)
      .single();

    if (data) {
      const updated = data as unknown as OpFile;
      setSelected(updated);
      setFiles(files.map((f) => (f.id === updated.id ? updated : f)));
    }

    if (selected.customer?.id) {
      await supabase.from('workflow_timeline').insert({
        customer_id: selected.customer.id,
        stage: 'flight',
        stage_label: 'قسم الطيران',
        department: 'التشغيل',
        employee_id: targetFlightEmpId || null,
        status: 'مكتمل',
        notes: flightTransferNotes || 'تم تحويل الملف من قسم التشغيل إلى مسؤول الطيران',
      });
    }

    if (targetFlightEmpId) {
      await supabase.from('notifications').insert({
        employee_id: targetFlightEmpId,
        type: 'task_assigned',
        title: 'ملف جديد محول من قسم التشغيل لإصدار التذاكر',
        body: `العميل: ${selected.customer?.name || '—'} - ملاحظات التشغيل: ${flightTransferNotes}`,
      });
    }

    setFlightTransferring(false);
    setShowFlightTransferModal(false);
    setFlightTransferNotes('');
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('operation_files')
      .select(`
        *,
        customer:customers(*),
        booking:bookings(*),
        hotel:hotels(*),
        assigned_employee:employees!operation_files_assigned_to_fkey(id, name)
      `)
      .order('created_at', { ascending: false });
    const rows = (data as unknown as OpFile[]) || [];
    setFiles(rows);
    setStats({
      total: rows.length,
      ready: rows.filter((r) => r.file_status === 'جاهز للسفر').length,
      incomplete: rows.filter((r) => r.file_status === 'مستندات ناقصة').length,
      inProgress: rows.filter((r) => r.file_status === 'قيد التجهيز' || r.file_status === 'جديد').length,
      flight: rows.filter((r) => r.workflow_stage === 'flight').length,
    });
    setLoading(false);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name').eq('is_active', true).order('name');
    setEmployees((data as { id: string; name: string }[]) || []);
  };

  const openDetail = async (f: OpFile) => {
    setSelected(f);
    setNewNotes(f.notes || '');
    // Load operation file documents
    const { data: docsData } = await supabase
      .from('operation_file_documents')
      .select('*')
      .eq('operation_file_id', f.id)
      .order('created_at', { ascending: false });
    setOpDocs((docsData as OpDoc[]) || []);
    // Load customer documents
    if (f.customer?.id) {
      const { data: custDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', f.customer.id)
        .order('created_at', { ascending: false });
      setCustomerDocs(custDocs || []);
    }
    // Load payments
    if (f.booking?.id) {
      const { data: payData } = await supabase
        .from('payments')
        .select('*, user_profiles(*)')
        .eq('booking_id', f.booking.id)
        .order('payment_date', { ascending: false });
      setPayments(payData || []);
      // Load invoices
      const { data: invData } = await supabase
        .from('invoices')
        .select('*, hotel:hotels(name)')
        .eq('customer_id', f.customer?.id)
        .order('created_at', { ascending: false });
      setInvoices(invData || []);
    }
  };

  const filtered = files.filter((f) => {
    if (statusFilter && f.file_status !== statusFilter) return false;
    if (stageFilter && f.workflow_stage !== stageFilter) return false;
    const q = search.toLowerCase();
    if (q) {
      const name = f.customer?.name?.toLowerCase() || '';
      const code = f.customer?.client_code?.toLowerCase() || '';
      const opNum = f.op_number?.toLowerCase() || '';
      if (!name.includes(q) && !code.includes(q) && !opNum.includes(q)) return false;
    }
    return true;
  });

  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('ar-EG') : '—';

  const updateFile = async (updates: Record<string, any>) => {
    if (!selected) return;
    setSaving(true);
    const { data } = await supabase
      .from('operation_files')
      .update(updates)
      .eq('id', selected.id)
      .select(`
        *,
        customer:customers(*),
        booking:bookings(*),
        hotel:hotels(*),
        assigned_employee:employees!operation_files_assigned_to_fkey(id, name)
      `)
      .single();
    if (data) {
      const updated = data as unknown as OpFile;
      setSelected(updated);
      setFiles(files.map((f) => (f.id === updated.id ? updated : f)));
      setStats((s) => ({
        ...s,
        ready: files.filter((f) => f.id === updated.id ? updated.file_status === 'جاهز للسفر' : f.file_status === 'جاهز للسفر').length,
        incomplete: files.filter((f) => f.id === updated.id ? updated.file_status === 'مستندات ناقصة' : f.file_status === 'مستندات ناقصة').length,
        inProgress: files.filter((f) => f.id === updated.id ? ['قيد التجهيز', 'جديد'].includes(updated.file_status) : ['قيد التجهيز', 'جديد'].includes(f.file_status)).length,
      }));
    }
    setSaving(false);
  };

  const uploadOpDoc = async (file: File) => {
    if (!selected) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('الملفات المدعومة: PDF, JPG, PNG فقط');
      return;
    }
    setUploadingDoc(true);
    const filePath = `op-docs/${selected.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setUploadingDoc(false); return; }
    const { data } = await supabase
      .from('operation_file_documents')
      .insert({
        operation_file_id: selected.id,
        doc_type: newDocType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: profile?.id || null,
      })
      .select('*')
      .single();
    if (data) setOpDocs([data as OpDoc, ...opDocs]);
    setUploadingDoc(false);
  };

  const deleteOpDoc = async (doc: OpDoc) => {
    await supabase.storage.from('documents').remove([doc.file_path]);
    await supabase.from('operation_file_documents').delete().eq('id', doc.id);
    setOpDocs(opDocs.filter((d) => d.id !== doc.id));
  };

  const currentStageIndex = selected ? workflowStages.findIndex((s) => s.key === (selected.workflow_stage || 'new')) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">لوحة التشغيل</h2>
        <p className="section-subtitle">ملفات التشغيل — إدارة كاملة للعمليات، المستندات، الحسابات، التأشيرات، والطيران</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'إجمالي الملفات', value: stats.total, icon: FileCheck, color: 'text-navy-700', bg: 'bg-navy-50' },
          { label: 'جاهز للسفر', value: stats.ready, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'قيد التجهيز', value: stats.inProgress, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مستندات ناقصة', value: stats.incomplete, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'جاهز للطيران', value: stats.flight, icon: Plane, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <Icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-black text-navy-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الملف (OP-1001)، كود العميل (CL-1001)، أو الاسم..."
            className="form-input pr-10"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input sm:w-40">
          <option value="">كل الحالات</option>
          {fileStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="form-input sm:w-40">
          <option value="">كل المراحل</option>
          {workflowStages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Files */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد ملفات تشغيل</p>
            <p className="text-sm mt-1">تظهر ملفات التشغيل تلقائياً عند تأكيد الحجوزات</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((f) => {
              const sc = statusConfig[f.file_status] || statusConfig['جديد'];
              const pc = priorityConfig[f.priority || 'عادية'] || priorityConfig['عادية'];
              const remaining = Math.max(0, Number(f.booking?.total_amount || 0) - Number(f.booking?.paid_amount || 0));
              return (
                <div key={f.id} className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openDetail(f)}>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Customer info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-navy flex items-center justify-center text-gold-400 font-black flex-shrink-0">
                        {f.customer?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-navy-900 text-sm truncate">{f.customer?.name || 'عميل غير معروف'}</h3>
                          {f.customer?.client_code && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-md">
                              <Hash size={10} />{f.customer.client_code}
                            </span>
                          )}
                          {f.priority === 'عاجلة' && (
                            <span className={`badge text-xs ${pc.bg} ${pc.color} flex items-center gap-1`}><Flag size={9} /> عاجلة</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          {f.customer?.phone && <span className="flex items-center gap-1"><Phone size={11} /><span dir="ltr">{f.customer.phone}</span></span>}
                          {f.op_number && <span className="flex items-center gap-1 font-mono font-semibold text-navy-600"><FileCheck size={11} />{f.op_number}</span>}
                          {f.pax_count && f.pax_count > 1 && <span className="flex items-center gap-1"><Users size={11} /> {f.pax_count} مسافر</span>}
                          {f.assigned_employee?.name && <span className="flex items-center gap-1"><UserCheck size={11} /> {f.assigned_employee.name}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {f.visa_status === 'مرفوضة' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg"><AlertCircle size={11} /> تأشيرة مرفوضة</span>
                          )}
                          {f.visa_status === 'تمت الموافقة' && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg"><CheckCircle2 size={11} /> تأشيرة معتمدة</span>
                          )}
                          {(f.visa_status === 'قيد التقديم' || f.visa_status === 'قيد المراجعة') && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg"><Clock size={11} /> {f.visa_status}</span>
                          )}
                          {f.visa_upload_status === 'Uploaded' && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg"><FileCheck size={11} /> ملف التأشيرة</span>
                          )}
                          {f.workflow_stage === 'flight' && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-lg"><Plane size={11} /> جاهز للطيران</span>
                          )}
                          {f.workflow_stage === 'ready' && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg"><CheckCircle2 size={11} /> جاهز للسفر</span>
                          )}
                          {f.financially_approved && f.workflow_stage !== 'flight' && f.workflow_stage !== 'ready' && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg"><CheckCircle2 size={11} /> معتمد مالياً</span>
                          )}
                          {f.booking?.source === 'Website' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-gold-700 bg-gold-100 px-2 py-0.5 rounded-lg"><Globe size={10} /> Website</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Booking info */}
                    <div className="flex flex-col gap-2 lg:w-56 flex-shrink-0">
                      {f.booking ? (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`badge ${f.booking.status === 'مؤكد' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{f.booking.status}</span>
                            <span className={`badge ${f.booking.payment_status === 'مدفوع بالكامل' ? 'bg-emerald-100 text-emerald-700' : f.booking.payment_status === 'مدفوع جزئياً' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{f.booking.payment_status}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Wallet size={12} className="text-navy-500" />
                            <span>{fmt(f.booking.total_amount || 0)} ج.م</span>
                            {remaining > 0 && <span className="text-red-600 font-semibold">· متبقي {fmt(remaining)} ج.م</span>}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">لا يوجد حجز</span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex flex-col gap-1 text-xs text-gray-500 lg:w-40 flex-shrink-0">
                      {f.travel_date && (
                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gold-600" /> سفر: {fmtDate(f.travel_date)}</div>
                      )}
                      {f.return_date && (
                        <div className="flex items-center gap-1.5"><Plane size={12} className="text-gold-600" /> عودة: {fmtDate(f.return_date)}</div>
                      )}
                      {f.hotel && (
                        <div className="flex items-center gap-1.5"><HotelIcon size={12} className="text-gold-600" /> {f.hotel.name}</div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge text-xs ${sc.bg} ${sc.color}`}>{f.file_status}</span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-navy p-5 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><FileCheck size={22} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{selected.customer?.name || '—'}</h3>
                    <div className="flex items-center gap-3 text-xs text-white/60 mt-0.5">
                      {selected.op_number && <span className="font-mono">{selected.op_number}</span>}
                      {selected.customer?.client_code && <span className="font-mono">{selected.customer.client_code}</span>}
                      <span className={`badge text-xs ${priorityConfig[selected.priority || 'عادية']?.bg || 'bg-blue-100'} ${priorityConfig[selected.priority || 'عادية']?.color || 'text-blue-700'}`}>{selected.priority || 'عادية'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Workflow Pipeline */}
              <div>
                <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><Briefcase size={15} className="text-gold-500" /> مسار العمل (Workflow Pipeline)</h4>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {workflowStages.map((stage, i) => {
                    const Icon = stage.icon;
                    const isDone = i <= currentStageIndex;
                    const isCurrent = i === currentStageIndex;
                    return (
                      <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
                        <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${isCurrent ? 'bg-navy-100 ring-2 ring-navy-400' : isDone ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {isDone ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                          </div>
                          <span className={`text-xs font-medium ${isDone ? 'text-emerald-700' : 'text-gray-400'}`}>{stage.label}</span>
                        </div>
                        {i < workflowStages.length - 1 && <div className={`w-4 h-0.5 ${i < currentStageIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                      </div>
                    );
                  })}
                </div>
                {/* Send to Aviation Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-cyan-50/80 p-3.5 rounded-xl border border-cyan-200 mt-3 gap-2">
                  <div>
                    <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                      <Plane size={15} className="text-cyan-600" />
                      تحويل الملف إلى مسؤول قسم الطيران (Aviation Transfer)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      كتابة ملاحظات موظف التشغيل وإرسال الملف مباشرة لمسؤول الطيران لإصدار التذاكر
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFlightTransferNotes(selected.notes || '');
                      setShowFlightTransferModal(true);
                    }}
                    className="btn-gold text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    <Plane size={14} /> تحويل للطيران + ملاحظات
                  </button>
                </div>
              </div>

              {/* Customer + Booking info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">بيانات العميل</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><User size={14} className="text-navy-500" /><span className="text-gray-500">الاسم:</span><span className="font-semibold text-navy-900">{selected.customer?.name || '—'}</span></div>
                    <div className="flex items-center gap-2"><Phone size={14} className="text-navy-500" /><span className="text-gray-500">الهاتف:</span><span className="font-semibold text-navy-900" dir="ltr">{selected.customer?.phone || '—'}</span></div>
                    {selected.customer?.email && <div className="flex items-center gap-2"><Mail size={14} className="text-navy-500" /><span className="text-gray-500">البريد:</span><span className="font-semibold text-navy-900">{selected.customer.email}</span></div>}
                    <div className="flex items-center gap-2"><Hash size={14} className="text-navy-500" /><span className="text-gray-500">Client Code:</span><span className="font-mono font-bold text-gold-600">{selected.customer?.client_code || '—'}</span></div>
                    <div className="flex items-center gap-2"><Users size={14} className="text-navy-500" /><span className="text-gray-500">المسافرين:</span><span className="font-semibold text-navy-900">{selected.pax_count || selected.booking?.pax_count || 1}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">بيانات الحجز</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Package size={14} className="text-navy-500" /><span className="text-gray-500">الباقة:</span><span className="font-semibold text-navy-900">{selected.booking?.package_name || '—'}</span></div>
                    <div className="flex items-center gap-2"><Globe size={14} className="text-navy-500" /><span className="text-gray-500">الوجهة:</span><span className="font-semibold text-navy-900">{selected.booking?.destination || '—'}</span></div>
                    {selected.hotel && <div className="flex items-center gap-2"><HotelIcon size={14} className="text-navy-500" /><span className="text-gray-500">الفندق:</span><span className="font-semibold text-navy-900">{selected.hotel.name}</span></div>}
                    {selected.travel_date && <div className="flex items-center gap-2"><Calendar size={14} className="text-navy-500" /><span className="text-gray-500">السفر:</span><span className="font-semibold text-navy-900">{fmtDate(selected.travel_date)}</span></div>}
                    {selected.return_date && <div className="flex items-center gap-2"><Plane size={14} className="text-navy-500" /><span className="text-gray-500">العودة:</span><span className="font-semibold text-navy-900">{fmtDate(selected.return_date)}</span></div>}
                  </div>
                </div>
              </div>

              {/* Financial summary */}
              <div>
                <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><Wallet size={15} className="text-gold-500" /> الملخص المالي</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'إجمالي الحجز', value: fmt(Number(selected.booking?.total_amount || 0)), color: 'text-navy-900' },
                    { label: 'المدفوع', value: fmt(Number(selected.booking?.paid_amount || 0)), color: 'text-emerald-600' },
                    { label: 'المتبقي', value: fmt(Math.max(0, Number(selected.booking?.total_amount || 0) - Number(selected.booking?.paid_amount || 0))), color: 'text-red-600' },
                    { label: 'حالة الدفع', value: selected.booking?.payment_status || '—', color: 'text-navy-700' },
                  ].map((r) => (
                    <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{r.label}</p>
                      <p className={`text-sm font-bold ${r.color}`}>{r.value}</p>
                    </div>
                  ))}
                </div>
                {/* Payments list */}
                {payments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-gray-100 text-xs">
                        <div className="flex items-center gap-2">
                          <CreditCard size={13} className="text-navy-500" />
                          <span className="font-semibold text-navy-800">{p.payment_type || 'دفعة'}</span>
                          <span className="text-gray-400">{p.payment_method}</span>
                          <span className={`badge text-xs ${p.approval_status === 'معتمد' ? 'bg-emerald-100 text-emerald-700' : p.approval_status === 'مرفوض' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.approval_status || 'بانتظار'}</span>
                        </div>
                        <span className="font-bold text-navy-900">{fmt(p.amount)} ج.م</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visa status */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><Shield size={15} className="text-gold-500" /> حالة التأشيرة</h4>
                <div className="flex items-center gap-3 flex-wrap">
                  {selected.visa_status === 'تمت الموافقة' ? (
                    <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} /> تمت الموافقة</span>
                  ) : selected.visa_status === 'مرفوضة' ? (
                    <span className="badge bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle size={14} /> مرفوضة</span>
                  ) : selected.visa_status ? (
                    <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1"><Clock size={14} /> {selected.visa_status}</span>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-500">لم يتم التقديم</span>
                  )}
                  {selected.visa_upload_status === 'Uploaded' && (
                    <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1"><FileCheck size={14} /> ملف التأشيرة مرفوع</span>
                  )}
                </div>
              </div>

              {/* Customer documents */}
              <div>
                <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><FileText size={15} className="text-gold-500" /> مستندات العميل</h4>
                {customerDocs.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-3">لا توجد مستندات مرفوعة</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {customerDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-red-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy-900">{doc.doc_type}</p>
                          <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                        </div>
                        <span className={`badge text-xs ${doc.status === 'مقبول' ? 'bg-emerald-100 text-emerald-700' : doc.status === 'مرفوض' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status}</span>
                        <button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600); if (data) window.open(data.signedUrl); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Eye size={14} /></button>
                        <button onClick={async () => { const { data } = await supabase.storage.from('documents').download(doc.file_path); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = doc.file_name; a.click(); } }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Download size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Operational documents upload */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2"><FilePlus size={15} className="text-gold-500" /> مستندات التشغيل</h4>
                  <div className="flex items-center gap-2">
                    <select value={newDocType} onChange={(e) => setNewDocType(e.target.value)} className="form-input text-xs py-1.5 w-36">
                      {opDocTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => docFileRef.current?.click()} disabled={uploadingDoc} className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1">
                      {uploadingDoc ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> رفع</>}
                    </button>
                    <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOpDoc(f); e.target.value = ''; }} />
                  </div>
                </div>
                {opDocs.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-3">لا توجد مستندات تشغيل مرفوعة</p>
                ) : (
                  <div className="space-y-2">
                    {opDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-blue-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy-900">{doc.doc_type}</p>
                          <p className="text-xs text-gray-400 truncate">{doc.file_name} · {fmtDate(doc.created_at)}</p>
                        </div>
                        <button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600); if (data) window.open(data.signedUrl); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Eye size={14} /></button>
                        <button onClick={async () => { const { data } = await supabase.storage.from('documents').download(doc.file_path); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = doc.file_name; a.click(); } }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Download size={14} /></button>
                        <button onClick={() => deleteOpDoc(doc)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoices */}
              {invoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><FileText size={15} className="text-gold-500" /> الفواتير</h4>
                  <div className="space-y-1.5">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-navy-500" />
                          <span className="font-mono font-semibold text-navy-700">{inv.invoice_number || '—'}</span>
                          {inv.hotel?.name && <span className="text-gray-400">· {inv.hotel.name}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-navy-900">{fmt(Number(inv.total_amount || 0))} ج.م</span>
                          <span className={`badge text-xs ${inv.status === 'مدفوعة' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment + Status + Priority controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">الموظف المسؤول</label>
                  <select
                    value={selected.assigned_to || ''}
                    onChange={(e) => updateFile({ assigned_to: e.target.value || null })}
                    className="form-input"
                  >
                    <option value="">— غير مسند —</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">حالة الملف</label>
                  <select
                    value={selected.file_status}
                    onChange={(e) => updateFile({ file_status: e.target.value })}
                    className="form-input"
                  >
                    {fileStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">الأولوية</label>
                  <select
                    value={selected.priority || 'عادية'}
                    onChange={(e) => updateFile({ priority: e.target.value })}
                    className="form-input"
                  >
                    <option value="عاجلة">عاجلة</option>
                    <option value="عادية">عادية</option>
                    <option value="منخفضة">منخفضة</option>
                  </select>
                </div>
              </div>

              {/* Travel dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">تاريخ السفر</label>
                  <input
                    type="date"
                    value={selected.travel_date || ''}
                    onChange={(e) => updateFile({ travel_date: e.target.value || null })}
                    className="form-input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="form-label">تاريخ العودة</label>
                  <input
                    type="date"
                    value={selected.return_date || ''}
                    onChange={(e) => updateFile({ return_date: e.target.value || null })}
                    className="form-input"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Pax count + special requests */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">عدد المسافرين</label>
                  <input
                    type="number"
                    min="1"
                    value={selected.pax_count || 1}
                    onChange={(e) => updateFile({ pax_count: parseInt(e.target.value) || 1 })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">طلبات خاصة</label>
                  <input
                    value={selected.special_requests || ''}
                    onChange={(e) => updateFile({ special_requests: e.target.value || null })}
                    className="form-input"
                    placeholder="وجبات خاصة، مساعدة ذوي الهمم..."
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label flex items-center gap-1.5"><MessageSquare size={13} className="text-navy-500" /> ملاحظات داخلية</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="form-input resize-none"
                  rows={3}
                  placeholder="ملاحظات التشغيل..."
                />
                <button
                  onClick={() => updateFile({ notes: newNotes })}
                  disabled={saving}
                  className="btn-outline text-xs py-1.5 px-3 mt-2"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ الملاحظات'}
                </button>
              </div>

              {/* Financial approval */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className={selected.financially_approved ? 'text-emerald-600' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-bold text-navy-900">الاعتماد المالي</p>
                    <p className="text-xs text-gray-500">{selected.financially_approved ? 'تم الاعتماد مالياً' : 'بانتظار الاعتماد المالي'}</p>
                  </div>
                </div>
                {!selected.financially_approved ? (
                  <button
                    onClick={() => updateFile({ financially_approved: true })}
                    className="btn-gold text-xs py-2 px-4 flex items-center gap-1"
                  >
                    <CheckCircle2 size={14} /> اعتماد مالي
                  </button>
                ) : (
                  <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} /> معتمد</span>
                )}
              </div>

              {/* Navigate to customer */}
              {onNavigate && selected.customer?.id && (
                <button
                  onClick={() => onNavigate('customer-details', selected.customer!.id)}
                  className="text-xs text-navy-600 font-semibold hover:underline flex items-center gap-1"
                >
                  عرض ملف العميل الكامل <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      {/* Transfer to Flight Modal */}
      {showFlightTransferModal && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl" onClick={() => setShowFlightTransferModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-cyan-100 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-cyan-600 border-b border-gray-100 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center">
                <Plane size={24} />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-base">تحويل الملف إلى قسم الطيران</h3>
                <p className="text-xs text-gray-500">العميل: <span className="font-semibold text-navy-900">{selected.customer?.name || '—'}</span></p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label font-bold text-navy-900 text-xs">اختر مسؤول الطيران المستلم:</label>
                <select
                  value={targetFlightEmpId}
                  onChange={(e) => setTargetFlightEmpId(e.target.value)}
                  className="form-input text-xs"
                >
                  <option value="">— جميع موظفي ومسؤولي قسم الطيران —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label font-bold text-navy-900 text-xs">
                  ملاحظات وتوجيهات موظف التشغيل إلى مسؤول الطيران <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={flightTransferNotes}
                  onChange={(e) => setFlightTransferNotes(e.target.value)}
                  className="form-input text-xs resize-none"
                  rows={4}
                  placeholder="اكتب ملاحظات التشغيل (مثال: درجات السفر المطلوب إصدارها، تفاصيل أرقام الجوازات والمواعيد، طلبات الوجبات أو المقاعد...)"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSendToFlight}
                disabled={flightTransferring}
                className="btn-gold flex-1 justify-center text-xs py-2.5"
              >
                {flightTransferring ? 'جارٍ الإرسال...' : 'تأكيد وإرسال إلى قسم الطيران'}
              </button>
              <button
                onClick={() => setShowFlightTransferModal(false)}
                className="btn-outline flex-1 justify-center text-xs py-2.5"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
