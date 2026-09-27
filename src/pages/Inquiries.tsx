import { useState, useEffect } from 'react';
import {
  MessageSquare, Plus, Search, Eye, Pencil, Trash2, X,
  Phone, Globe, MessageCircle, PhoneCall, MapPin,
  Facebook, Instagram, ArrowRightLeft, CheckCircle2,
  Clock, AlertCircle, XCircle, Download, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import type { Inquiry, InquiryStatus, InquirySource, InquiryServiceType, Employee, DocumentRecord } from '../types';

const STATUS_COLORS: Record<InquiryStatus, string> = {
  'جديد': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'قيد المتابعة': 'bg-amber-100 text-amber-700 border-amber-200',
  'تم التحويل': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'مغلق': 'bg-gray-100 text-gray-600 border-gray-200',
};
const STATUS_ICONS: Record<InquiryStatus, React.ElementType> = {
  'جديد': AlertCircle,
  'قيد المتابعة': Clock,
  'تم التحويل': CheckCircle2,
  'مغلق': XCircle,
};

const SOURCE_ICONS: Record<InquirySource, React.ElementType> = {
  'الموقع الإلكتروني': Globe,
  'واتساب': MessageCircle,
  'مكالمة': PhoneCall,
  'زيارة': MapPin,
  'فيسبوك': Facebook,
  'إنستجرام': Instagram,
};
const SOURCE_COLORS: Record<InquirySource, string> = {
  'الموقع الإلكتروني': 'text-emerald-600 bg-emerald-50',
  'واتساب': 'text-emerald-600 bg-emerald-50',
  'مكالمة': 'text-violet-600 bg-violet-50',
  'زيارة': 'text-orange-600 bg-orange-50',
  'فيسبوك': 'text-emerald-700 bg-emerald-100',
  'إنستجرام': 'text-pink-600 bg-pink-50',
};

const STATUSES: InquiryStatus[] = ['جديد', 'قيد المتابعة', 'تم التحويل', 'مغلق'];
const SOURCES: InquirySource[] = ['الموقع الإلكتروني', 'واتساب', 'مكالمة', 'زيارة', 'فيسبوك', 'إنستجرام'];
const SERVICE_TYPES: InquiryServiceType[] = ['حج', 'عمرة', 'رحلة داخلية', 'فندق', 'أخرى'];



function generateInquiryNumber(): string {
  return `INQ-${Date.now().toString().slice(-6)}`;
}

interface InquiryModalProps {
  inquiry?: Inquiry | null;
  employees: Employee[];
  onClose: () => void;
  onSave: () => void;
}

function InquiryModal({ inquiry, employees, onClose, onSave }: InquiryModalProps) {
  const [form, setForm] = useState({
    inquiry_number: inquiry?.inquiry_number ?? generateInquiryNumber(),
    customer_name: inquiry?.customer_name ?? '',
    phone: inquiry?.phone ?? '',
    service_type: inquiry?.service_type ?? ('عمرة' as InquiryServiceType),
    source: inquiry?.source ?? ('واتساب' as InquirySource),
    status: inquiry?.status ?? ('جديد' as InquiryStatus),
    assigned_employee_id: inquiry?.assigned_employee_id ?? '',
    notes: inquiry?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const payload = {
      ...form,
      assigned_employee_id: form.assigned_employee_id || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = inquiry
      ? await supabase.from('inquiries').update(payload).eq('id', inquiry.id)
      : await supabase.from('inquiries').insert(payload);
    setSaving(false);
    if (error) {
      console.error('Failed to save inquiry:', error);
      setSaveError(error.code === '23505' ? 'رقم الاستعلام مستخدم بالفعل. أغلق النافذة وحاول مرة أخرى.' : `تعذر حفظ الاستعلام: ${error.message}`);
      return;
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-navy-900">{inquiry ? 'تعديل الاستعلام' : 'استعلام جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الاستعلام</label>
              <input className="input-field bg-gray-50 text-sm" readOnly value={form.inquiry_number} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as InquiryStatus }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
              <input className="input-field" required value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="الاسم الكامل" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input className="input-field" dir="ltr" required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخدمة</label>
              <select className="input-field" value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value as InquiryServiceType }))}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المصدر</label>
              <select className="input-field" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as InquirySource }))}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الموظف المسؤول</label>
              <select className="input-field" value={form.assigned_employee_id} onChange={e => setForm(p => ({ ...p, assigned_employee_id: e.target.value }))}>
                <option value="">غير محدد</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
              <textarea className="input-field resize-none" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="تفاصيل الاستعلام وملاحظات المتابعة" />
            </div>
          </div>
          {saveError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-gold flex-1 justify-center">
              {saving ? 'جارٍ الحفظ...' : inquiry ? 'حفظ التعديلات' : 'إضافة الاستعلام'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConvertModalProps {
  inquiry: Inquiry;
  employees: Employee[];
  onClose: () => void;
  onConverted: () => void;
}

function ConvertModal({ inquiry, employees, onClose, onConverted }: ConvertModalProps) {
  const { profile } = useAuth();
  const [converting, setConverting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<'crm' | 'accounts'>('accounts');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const accountsEmployees = employees.filter((e) => e.role === 'محاسب' || e.role === 'مالك النظام' || e.role === 'مدير النظام' || e.role === 'super_admin');

  const handleConvert = async () => {
    setConverting(true);
    const requestedAt = new Date().toISOString();
    const { data: employee } = profile?.email
      ? await supabase.from('employees').select('id').eq('email', profile.email).maybeSingle()
      : { data: null };
    const actorEmployeeId = employee?.id || inquiry.assigned_employee_id || null;
    const { data: pendingRequest } = await supabase.from('approval_requests').select('id').eq('type', 'crm_conversion').eq('record_id', inquiry.id).eq('status', 'pending').maybeSingle();
    if (!pendingRequest) {
      const { error } = await supabase.from('approval_requests').insert({
        type: 'crm_conversion', record_id: inquiry.id, record_type: 'inquiries', requested_by: profile?.id,
        customer_id: null, reason: transferNotes || 'طلب تحويل الاستعلام إلى CRM',
        record_details: { customer_name: inquiry.customer_name, phone: inquiry.phone, source: inquiry.source, service_type: inquiry.service_type, notes: inquiry.notes, transfer_notes: transferNotes, assigned_employee_id: targetEmployeeId || inquiry.assigned_employee_id, requested_by_name: profile?.name }
      });
      if (error) { alert('تعذر إرسال الطلب: ' + error.message); setConverting(false); return; }
    }
    const { error: updateError } = await supabase.from('inquiries').update({ crm_conversion_status:'pending', crm_conversion_requested_by:actorEmployeeId, crm_conversion_requested_at:requestedAt }).eq('id',inquiry.id);
    if (updateError) { alert('تم إنشاء طلب الموافقة، لكن تعذر تحديث حالة الاستعلام: ' + updateError.message); setConverting(false); return; }
    const { error: auditError } = await supabase.from('audit_logs').insert({ actor_id:actorEmployeeId, action:'request_crm_conversion', entity_type:'inquiry', entity_id:inquiry.id, new_data:{status:'pending'} });
    if (auditError) console.error('Failed to write CRM conversion audit log:', auditError);
    alert('تم إرسال طلب التحويل إلى الأدمن للموافقة. لن يتم إنشاء العميل في CRM قبل الاعتماد.');
    setConverting(false);
    onConverted();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <ArrowRightLeft size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-navy-900">تحويل العميل من مسار "إضافة العملاء"</h3>
            <p className="text-gray-500 text-xs mt-1">
              اختر قسم الوجهة لتحويل بيانات <strong>{inquiry.customer_name}</strong>
            </p>
          </div>

          {/* Transfer Target selection */}
          <div className="grid grid-cols-2 gap-3 text-right">
            <button
              type="button"
              onClick={() => setTransferTarget('accounts')}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                transferTarget === 'accounts'
                  ? 'border-gold-500 bg-gold-50 text-navy-900 font-bold shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <span className="text-xs font-bold text-gold-700">1. تحويل لـ قسم الحسابات</span>
              <span className="text-[10px] text-gray-500">إرسال للمحاسب لمعالجة الدفعات والفواتير</span>
            </button>
            <button
              type="button"
              onClick={() => setTransferTarget('crm')}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                transferTarget === 'crm'
                  ? 'border-gold-500 bg-gold-50 text-navy-900 font-bold shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <span className="text-xs font-bold text-navy-700">2. تحويل لـ العملاء CRM</span>
              <span className="text-[10px] text-gray-500">إضافة لقاعدة بيانات العملاء والمتابعة</span>
            </button>
          </div>

          {/* Employee selection if accounts */}
          {transferTarget === 'accounts' && (
            <div className="text-right space-y-2">
              <label className="text-xs font-bold text-navy-900 block">اختر موظف الحسابات المسؤول:</label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="form-input text-xs"
              >
                <option value="">— جميع موظفي قسم الحسابات —</option>
                {accountsEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer notes */}
          <div className="text-right space-y-1">
            <label className="text-xs font-bold text-navy-900 block">ملاحظات التحويل والتعليمات:</label>
            <textarea
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="form-input text-xs resize-none"
              rows={3}
              placeholder="اكتب ملاحظات لموظف الحسابات أو الفريق..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleConvert} disabled={converting} className="btn-gold flex-1 justify-center text-xs py-2.5">
              {converting ? 'جارٍ الإرسال...' : 'Request CRM Conversion'}
            </button>
            <button onClick={onClose} className="btn-outline flex-1 justify-center text-xs py-2.5">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetailModalProps {
  inquiry: Inquiry;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => void;
}

function InquiryDetailModal({ inquiry, onClose, onEdit, onConvert }: DetailModalProps) {
  const StatusIcon = STATUS_ICONS[inquiry.status];
  const SourceIcon = SOURCE_ICONS[inquiry.source];
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const formattedNotes = (inquiry.notes || '')
    .split(/\s*[—|]\s*/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex === -1) return { label: '', value: part };
      return {
        label: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1).trim(),
      };
    });

  useEffect(() => {
    let active = true;
    setLoadingDocs(true);
    supabase
      .from('documents')
      .select('*')
      .eq('inquiry_id', inquiry.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setDocuments((data as DocumentRecord[]) || []);
          setLoadingDocs(false);
        }
      });
    return () => { active = false; };
  }, [inquiry.id]);

  const openDocument = (doc: DocumentRecord) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path);
    if (data.publicUrl) window.open(data.publicUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-navy-900">تفاصيل الاستعلام</h2>
            <p className="text-sm text-gray-500">{inquiry.inquiry_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center text-white font-bold text-lg">
              {inquiry.customer_name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-navy-900 text-lg">{inquiry.customer_name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1" dir="ltr"><Phone size={12} />{inquiry.phone}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">نوع الخدمة</p>
              <p className="font-semibold text-navy-900 text-sm">{inquiry.service_type}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">المصدر</p>
              <span className={`flex items-center gap-1 text-sm font-medium rounded-lg px-2 py-0.5 w-fit ${SOURCE_COLORS[inquiry.source]}`}>
                <SourceIcon size={12} />{inquiry.source}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">الحالة</p>
              <span className={`badge border text-xs flex items-center gap-1 w-fit ${STATUS_COLORS[inquiry.status]}`}>
                <StatusIcon size={11} />{inquiry.status}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">التاريخ</p>
              <p className="font-semibold text-navy-900 text-sm">{new Date(inquiry.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
            {inquiry.employees && (
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">الموظف المسؤول</p>
                <p className="font-semibold text-navy-900 text-sm">{inquiry.employees.name}</p>
              </div>
            )}
          </div>

          {inquiry.notes && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">الملاحظات</p>
              {formattedNotes.length > 1 ? (
                <div className="space-y-2">
                  {formattedNotes.map((note, index) => (
                    <div key={`${note.label}-${index}`} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                      {note.label ? (
                        <>
                          <p className="text-[11px] font-bold text-gold-700 mb-0.5">{note.label}</p>
                          <p className="text-sm text-navy-900 leading-relaxed whitespace-pre-wrap">{note.value || '—'}</p>
                        </>
                      ) : (
                        <p className="text-sm text-navy-900 leading-relaxed whitespace-pre-wrap">{note.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{inquiry.notes}</p>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <FileText size={14} className="text-gold-600" /> مستندات الحجز من الموقع
              </p>
              <span className="text-[11px] text-gray-500">{documents.length} مستند</span>
            </div>
            {loadingDocs ? (
              <p className="text-xs text-gray-500">جارٍ تحميل المستندات...</p>
            ) : documents.length === 0 ? (
              <p className="text-xs text-gray-500">لا توجد مستندات مرفقة لهذا الاستعلام.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => openDocument(doc)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2 text-right hover:border-gold-200 hover:bg-gold-50/30 transition-colors"
                  >
                    <span>
                      <span className="block text-xs font-bold text-navy-900">{doc.doc_type}</span>
                      <span className="block text-[11px] text-gray-500 truncate max-w-[220px]">{doc.file_name || doc.file_path}</span>
                    </span>
                    <Eye size={14} className="text-gold-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={onEdit} className="btn-secondary justify-center"><Pencil size={14} />تعديل</button>
            {inquiry.status !== 'تم التحويل' && inquiry.status !== 'مغلق' && (
              <button onClick={onConvert} className="btn-gold justify-center"><ArrowRightLeft size={14} />تحويل</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Inquiries() {
  const { can, profile } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | 'الكل'>('الكل');
  const [filterSource, setFilterSource] = useState<InquirySource | 'الكل'>('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editInquiry, setEditInquiry] = useState<Inquiry | null>(null);
  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);
  const [convertInquiry, setConvertInquiry] = useState<Inquiry | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    const [inqRes, empRes] = await Promise.all([
      supabase.from('inquiries').select('*, employees!inquiries_assigned_employee_id_fkey(id, name)').order('created_at', { ascending: false }),
      supabase.from('employees').select('id, name, role').eq('is_active', true),
    ]);
    if (inqRes.error) {
      console.error('Failed to load inquiries:', inqRes.error);
      setLoadError(`تعذر تحميل الاستعلامات: ${inqRes.error.message}`);
    }
    if (empRes.error) console.error('Failed to load employees:', empRes.error);
    
    let data = (inqRes.data as Inquiry[]) || [];
    
    if (profile?.role === 'مندوب مبيعات') {
      data = data.filter(c => c.assigned_employee_id === profile.id);
    } else if (profile?.role === 'قائد فريق المبيعات') {
      const { data: teamRelations } = await supabase.from('sales_teams').select('member_id').eq('leader_id', profile.id);
      const memberIds = teamRelations ? teamRelations.map(r => r.member_id) : [];
      data = data.filter(c => c.assigned_employee_id === profile.id || memberIds.includes(c.assigned_employee_id));
    }
    
    setInquiries(data);
    setEmployees((empRes.data as unknown as Employee[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (inq: Inquiry) => {
    if (inq.converted_customer_id) {
      alert('لا يمكن حذف الاستعلام لأنه تم تحويله ولا يزال موجوداً في مرحلة العملاء (CRM) أو الحسابات. يجب حذفه من المراحل التالية أولاً.');
      return;
    }

    if (inq.phone) {
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, name, source')
        .eq('phone', inq.phone)
        .eq('is_vip', false)
        .limit(1);

      if (existingCust && existingCust.length > 0) {
        const c = existingCust[0];
        if (!c.source || !c.source.startsWith('مسودة:')) {
          alert(`لا يمكن حذف هذا الاستعلام لأن العميل "${c.name}" موجود بالفعل في قسم العملاء (CRM) بنفس رقم الهاتف. يجب حذفه من قسم العملاء CRM أولاً.`);
          return;
        }
      }
    }

    if (!confirm('هل أنت متأكد من حذف هذا الاستعلام نهائياً؟')) return;
    await supabase.from('inquiries').delete().eq('id', inq.id);
    load();
  };

  const handleExportExcel = () => {
    const data = filtered.map(inq => ({
      'رقم الاستعلام': inq.inquiry_number,
      'الاسم': inq.customer_name,
      'الهاتف': inq.phone,
      'نوع الخدمة': inq.service_type || '—',
      'المصدر': inq.source || '—',
      'الحالة': inq.status,
      'الموظف المسؤول': inq.employees?.name || '—',
      'تاريخ الاستعلام': new Date(inq.created_at).toLocaleDateString('ar-EG'),
    }));
    exportToExcel(data, 'الاستعلامات');
  };

  const handleExportPDF = () => {
    const headers = ['رقم الاستعلام', 'الاسم', 'الهاتف', 'نوع الخدمة', 'المصدر', 'الحالة', 'الموظف المسؤول', 'تاريخ الاستعلام'];
    const rows = filtered.map(inq => [
      inq.inquiry_number,
      inq.customer_name,
      inq.phone,
      inq.service_type || '—',
      inq.source || '—',
      inq.status,
      inq.employees?.name || '—',
      new Date(inq.created_at).toLocaleDateString('ar-EG'),
    ]);
    exportToPDF('تقرير استعلامات العملاء', headers, rows);
  };

  const filtered = inquiries.filter(inq => {
    // Sales reps only see their own inquiries
    if (profile?.role === 'مندوب مبيعات') {
      const empId = employees.find(e => e.name === profile.name)?.id;
      if (empId && inq.assigned_employee_id && inq.assigned_employee_id !== empId) return false;
    }
    const matchSearch = !search || inq.customer_name.includes(search) || inq.phone.includes(search) || inq.inquiry_number.includes(search);
    const matchStatus = filterStatus === 'الكل' || inq.status === filterStatus;
    const matchSource = filterSource === 'الكل' || inq.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  });

  const stats = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === 'جديد').length,
    followUp: inquiries.filter(i => i.status === 'قيد المتابعة').length,
    converted: inquiries.filter(i => i.status === 'تم التحويل').length,
  };

  const sourceStats = SOURCES.map(src => ({
    source: src,
    count: inquiries.filter(i => i.source === src).length,
    Icon: SOURCE_ICONS[src],
    color: SOURCE_COLORS[src],
  })).filter(s => s.count > 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">الاستعلامات</h1>
          <p className="text-gray-500 text-sm mt-0.5">إدارة وتتبع استعلامات العملاء من جميع المصادر</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
            <Download size={14} /> PDF
          </button>
          {can('inquiries_add') && (
            <button onClick={() => { setEditInquiry(null); setShowModal(true); }} className="btn-gold">
              <Plus size={18} /> استعلام جديد
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <button onClick={load} className="font-bold underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الاستعلامات', value: stats.total, icon: MessageSquare, color: 'text-navy-600', bg: 'bg-navy-50' },
          { label: 'جديد', value: stats.new, icon: AlertCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'قيد المتابعة', value: stats.followUp, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'تم التحويل', value: stats.converted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Source breakdown */}
      {sourceStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-navy-900 mb-4 text-sm">توزيع المصادر</h3>
          <div className="flex flex-wrap gap-3">
            {sourceStats.map(({ source, count, Icon, color }) => (
              <div key={source} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${color} cursor-pointer`} onClick={() => setFilterSource(source === filterSource ? 'الكل' : source)}>
                <Icon size={14} />
                <span className="font-semibold text-sm">{source}</span>
                <span className="font-bold text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pr-9 py-2 text-sm w-full" placeholder="بحث بالاسم أو الهاتف أو رقم الاستعلام..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['الكل', ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filterStatus === s ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">قائمة الاستعلامات</h2>
          <span className="text-sm text-gray-500">{filtered.length} استعلام</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد استعلامات مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-right">
                  {['رقم الاستعلام', 'العميل', 'الخدمة', 'التأشيرة', 'المصدر', 'الموظف', 'الحالة', 'التاريخ', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inq => {
                  const StatusIcon = STATUS_ICONS[inq.status];
                  const SourceIcon = SOURCE_ICONS[inq.source];
                  return (
                    <tr key={inq.id} className="hover:bg-navy-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-navy-700 text-sm">{inq.inquiry_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {inq.customer_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-navy-900 text-sm">{inq.customer_name}</p>
                            <p className="text-xs text-gray-500" dir="ltr">{inq.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{inq.service_type}</td>
                      <td className="px-4 py-3">
                        {(inq.service_type === 'حج' || inq.service_type === 'عمرة') ? (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">Requires Visa</span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-500 text-xs">No Visa</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-1 w-fit ${SOURCE_COLORS[inq.source]}`}>
                          <SourceIcon size={11} />{inq.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{inq.employees?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge border text-xs flex items-center gap-1 w-fit ${STATUS_COLORS[inq.status]}`}>
                          <StatusIcon size={11} />{inq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(inq.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailInquiry(inq)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-navy-700"><Eye size={15} /></button>
                          {can('inquiries_edit') && (
                            <button onClick={() => { setEditInquiry(inq); setShowModal(true); }} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-500 hover:text-emerald-600"><Pencil size={15} /></button>
                          )}
                          {inq.status !== 'تم التحويل' && inq.status !== 'مغلق' && can('inquiries_edit') && (
                            <button onClick={() => setConvertInquiry(inq)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-500 hover:text-emerald-600" title="تحويل"><ArrowRightLeft size={15} /></button>
                          )}
                          {can('inquiries_delete') && (
                            <button onClick={() => handleDelete(inq)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"><Trash2 size={15} /></button>
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
        <InquiryModal
          inquiry={editInquiry}
          employees={employees}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
      {detailInquiry && (
        <InquiryDetailModal
          inquiry={detailInquiry}
          onClose={() => setDetailInquiry(null)}
          onEdit={() => { setEditInquiry(detailInquiry); setDetailInquiry(null); setShowModal(true); }}
          onConvert={() => { setConvertInquiry(detailInquiry); setDetailInquiry(null); }}
        />
      )}
      {convertInquiry && (
        <ConvertModal
          inquiry={convertInquiry}
          employees={employees}
          onClose={() => setConvertInquiry(null)}
          onConverted={() => { setConvertInquiry(null); load(); }}
        />
      )}
    </div>
  );
}
