import { useState, useEffect } from 'react';
import {
  MessageSquare, Plus, Search, Eye, Pencil, Trash2, X,
  Phone, Globe, MessageCircle, PhoneCall, MapPin,
  Facebook, Instagram, ArrowRightLeft, CheckCircle2,
  Clock, AlertCircle, XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Inquiry, InquiryStatus, InquirySource, InquiryServiceType, Employee } from '../types';

const STATUS_COLORS: Record<InquiryStatus, string> = {
  'جديد': 'bg-blue-100 text-blue-700 border-blue-200',
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
  'الموقع الإلكتروني': 'text-blue-600 bg-blue-50',
  'واتساب': 'text-emerald-600 bg-emerald-50',
  'مكالمة': 'text-violet-600 bg-violet-50',
  'زيارة': 'text-orange-600 bg-orange-50',
  'فيسبوك': 'text-blue-700 bg-blue-100',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      assigned_employee_id: form.assigned_employee_id || null,
      updated_at: new Date().toISOString(),
    };
    if (inquiry) {
      await supabase.from('inquiries').update(payload).eq('id', inquiry.id);
    } else {
      await supabase.from('inquiries').insert([payload]);
    }
    setSaving(false);
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
  const [converting, setConverting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<'crm' | 'accounts'>('accounts');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const accountsEmployees = employees.filter((e) => e.role === 'محاسب' || e.role === 'مالك النظام' || e.role === 'مدير النظام' || e.role === 'super_admin');

  const handleConvert = async () => {
    setConverting(true);
    // Create a new customer from inquiry
    const { data: newCustomer } = await supabase.from('customers').insert([{
      name: inquiry.customer_name,
      phone: inquiry.phone,
      service_type: inquiry.service_type === 'حج' ? 'حج' : inquiry.service_type === 'عمرة' ? 'عمرة' : undefined,
      source: inquiry.source,
      status: 'جديد',
      notes: transferNotes ? `${inquiry.notes ? inquiry.notes + ' | ' : ''}ملاحظات التحويل: ${transferNotes}` : inquiry.notes,
      assigned_employee_id: targetEmployeeId || undefined,
      visa_requirement: inquiry.service_type === 'حج' || inquiry.service_type === 'عمرة' ? 'Requires Visa' : 'No Visa Required',
    }]).select().maybeSingle();

    if (newCustomer) {
      // Link inquiry to the new customer
      await supabase.from('inquiries').update({
        status: 'تم التحويل',
        converted_customer_id: newCustomer.id,
        updated_at: new Date().toISOString(),
      }).eq('id', inquiry.id);

      // If transferring to Accounts, create an operation file record with stage 'accounts'
      if (transferTarget === 'accounts') {
        await supabase.from('operation_files').insert({
          customer_id: newCustomer.id,
          file_status: 'جديد',
          workflow_stage: 'accounts',
          notes: transferNotes || 'تم التحويل من قسم إضافة العملاء والاستعلامات إلى قسم الحسابات',
          assigned_to: targetEmployeeId || null,
          financially_approved: false,
        });

        // Notify selected employee or accounts team
        if (targetEmployeeId) {
          await supabase.from('notifications').insert({
            employee_id: targetEmployeeId,
            type: 'new_customer',
            title: 'عميل جديد محول إلى قسم الحسابات',
            body: `تم تحويل العميل ${newCustomer.name} إليك من قسم إضافة العملاء: ${transferNotes}`,
          });
        }
      }

      // Auto-create a visa file if the service requires a visa
      if (inquiry.service_type === 'حج' || inquiry.service_type === 'عمرة') {
        await supabase.from('visa_management').insert({
          client_code: newCustomer.client_code || null,
          customer_id: newCustomer.id,
          full_name: newCustomer.name,
          service_type: inquiry.service_type,
          visa_type: inquiry.service_type === 'حج' ? 'حج' : 'عمرة',
          country: 'السعودية',
          visa_status: 'لم يبدأ',
          visa_fee: 0,
        });
        // Auto-create travel checklist
        await supabase.from('travel_checklist').upsert({ customer_id: newCustomer.id }, { onConflict: 'customer_id' });
      }

      // Log workflow timeline
      await supabase.from('workflow_timeline').insert({
        customer_id: newCustomer.id,
        stage: transferTarget === 'accounts' ? 'accounts' : 'crm',
        stage_label: transferTarget === 'accounts' ? 'قسم الحسابات' : 'العملاء CRM',
        department: transferTarget === 'accounts' ? 'الحسابات' : 'المبيعات',
        employee_id: targetEmployeeId || null,
        status: 'مكتمل',
        notes: transferNotes || 'تم تحويل العميل من مسار الاستعلامات وإضافة العملاء',
      });
    }
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
              {converting ? 'جارٍ التحويل...' : 'تأكيد وإرسال التحويل'}
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
              <p className="text-sm text-gray-700">{inquiry.notes}</p>
            </div>
          )}

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

  const load = async () => {
    setLoading(true);
    const [inqRes, empRes] = await Promise.all([
      supabase.from('inquiries').select('*, employees(id, name)').order('created_at', { ascending: false }),
      supabase.from('employees').select('id, name, role').eq('is_active', true),
    ]);
    setInquiries((inqRes.data as Inquiry[]) || []);
    setEmployees((empRes.data as unknown as Employee[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاستعلام؟')) return;
    await supabase.from('inquiries').delete().eq('id', id);
    load();
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
        {can('inquiries_add') && (
          <button onClick={() => { setEditInquiry(null); setShowModal(true); }} className="btn-gold">
            <Plus size={18} /> استعلام جديد
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الاستعلامات', value: stats.total, icon: MessageSquare, color: 'text-navy-600', bg: 'bg-navy-50' },
          { label: 'جديد', value: stats.new, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
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
                            <button onClick={() => { setEditInquiry(inq); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-500 hover:text-blue-600"><Pencil size={15} /></button>
                          )}
                          {inq.status !== 'تم التحويل' && inq.status !== 'مغلق' && can('inquiries_edit') && (
                            <button onClick={() => setConvertInquiry(inq)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-500 hover:text-emerald-600" title="تحويل"><ArrowRightLeft size={15} /></button>
                          )}
                          {can('inquiries_delete') && (
                            <button onClick={() => handleDelete(inq.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"><Trash2 size={15} /></button>
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
