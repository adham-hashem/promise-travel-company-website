import { useEffect, useState, useRef } from 'react';
import {
  Plus, Eye, Pencil, Trash2, X, Phone,
  MapPin, CheckCircle2, AlertCircle, Loader2, Send, FileText, Upload,
  User, Package as PackageIcon, Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Customer, Package, ServiceType } from '../types';

const serviceTypes: { value: ServiceType; label: string; prefix: string }[] = [
  { value: 'حج', label: 'حج', prefix: 'HJ' },
  { value: 'عمرة', label: 'عمرة', prefix: 'OM' },
  { value: 'سياحة داخلية', label: 'سياحة داخلية', prefix: 'TR' },
];

const docTypes = [
  { id: 'جواز سفر', label: 'جواز السفر', required: true },
  { id: 'بطاقة رقم قومي', label: 'البطاقة الشخصية', required: true },
  { id: 'صورة شخصية', label: 'الصورة الشخصية', required: false },
  { id: 'تأشيرة', label: 'تأشيرة', required: false },
  { id: 'مستند إضافي', label: 'مستندات إضافية', required: false },
];

interface DocUpload {
  type: string;
  file: File | null;
  uploaded: boolean;
  filePath?: string;
}

const emptyForm = {
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  service_type: '' as ServiceType | '',
  requested_package_id: '',
  notes: '',
  source: 'مندوب مبيعات',
};

export default function SalesAgentPortal() {
  const { profile } = useAuth();
  const roleStr = (profile?.role as string) || '';
  const isSuperOrAdmin =
    roleStr === 'super_admin' ||
    roleStr === 'superadmin' ||
    roleStr === 'admin' ||
    roleStr === 'مالك النظام' ||
    roleStr === 'مدير النظام';

  const [drafts, setDrafts] = useState<Customer[]>([]);
  const [submitted, setSubmitted] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'drafts' | 'submitted'>('drafts');
  const isDrafts = !(isSuperOrAdmin && activeTab === 'submitted');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Send to CRM states
  const [showSendModal, setShowSendModal] = useState(false);
  const [customerToSend, setCustomerToSend] = useState<Customer | null>(null);
  const [checkingDocs, setCheckingDocs] = useState(false);
  const [hasPassport, setHasPassport] = useState(false);
  const [hasNationalId, setHasNationalId] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [sendNotes, setSendNotes] = useState('');

  // Details Modal States
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [viewCustomerDocs, setViewCustomerDocs] = useState<any[]>([]);

  // Document upload states
  const [docUploads, setDocUploads] = useState<Record<string, DocUpload>>(
    Object.fromEntries(docTypes.map((d) => [d.id, { type: d.id, file: null, uploaded: false }]))
  );
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewCustomer) {
      supabase
        .from('documents')
        .select('*')
        .eq('customer_id', viewCustomer.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setViewCustomerDocs(data);
        });
    } else {
      setViewCustomerDocs([]);
    }
  }, [viewCustomer]);

  const loadData = async () => {
    setLoading(true);
    try {
      let custQuery = supabase
        .from('customers')
        .select('*, packages(*), employees(*)');
      
      if (!isSuperOrAdmin && profile?.id) {
        custQuery = custQuery.eq('assigned_employee_id', profile.id);
      }
      
      custQuery = custQuery.eq('is_vip', false).order('created_at', { ascending: false });

      const [{ data: pkgData }, { data: custData }] = await Promise.all([
        supabase.from('packages').select('*').eq('is_active', true),
        custQuery
      ]);

      if (pkgData) setPackages(pkgData as Package[]);
      
      const allCustomers = (custData as Customer[]) || [];
      
      // Filter only customers added by sales agents (source is 'مندوب مبيعات' or starts with 'مندوب:')
      const salesAgentCustomers = allCustomers.filter(c => {
        return c.source && (c.source === 'مندوب مبيعات' || c.source.startsWith('مندوب:'));
      });

      // Filter drafts vs submitted
      setDrafts(salesAgentCustomers.filter(c => (c as any).sales_agent_submitted === false));
      setSubmitted(salesAgentCustomers.filter(c => (c as any).sales_agent_submitted === true));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditCustomer(null);
    setDocUploads(Object.fromEntries(docTypes.map((d) => [d.id, { type: d.id, file: null, uploaded: false }])));
    setError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone,
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      service_type: c.service_type || '',
      requested_package_id: c.requested_package_id || '',
      notes: c.notes || '',
      source: c.source ? c.source.replace(/^مندوب:\s*/, '') : 'مندوب مبيعات',
    });
    setDocUploads(Object.fromEntries(docTypes.map((d) => [d.id, { type: d.id, file: null, uploaded: false }])));
    setError('');
    setShowAddModal(true);
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    setDocUploads(prev => ({
      ...prev,
      [docType]: { ...prev[docType], file }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.service_type) {
      setError('الاسم بالكامل ورقم الهاتف ونوع الخدمة حقول مطلوبة');
      return;
    }
    setSaving(true);
    setError('');

    try {
      let customerId = '';
      if (editCustomer) {
        const formattedSource = form.source ? (form.source.startsWith('مندوب:') || form.source === 'مندوب مبيعات' ? form.source : 'مندوب: ' + form.source) : 'مندوب مبيعات';
        const { error: err } = await supabase
          .from('customers')
          .update({
            name: form.name,
            phone: form.phone,
            whatsapp: form.whatsapp || null,
            email: form.email || null,
            service_type: form.service_type || null,
            requested_package_id: form.requested_package_id || null,
            notes: form.notes || null,
            source: formattedSource,
          })
          .eq('id', editCustomer.id);
        if (err) throw err;
        customerId = editCustomer.id;
      } else {
        const formattedSource = form.source ? (form.source.startsWith('مندوب:') || form.source === 'مندوب مبيعات' ? form.source : 'مندوب: ' + form.source) : 'مندوب مبيعات';
        const { data, error: err } = await supabase
          .from('customers')
          .insert({
            name: form.name,
            phone: form.phone,
            whatsapp: form.whatsapp || null,
            email: form.email || null,
            service_type: form.service_type || null,
            requested_package_id: form.requested_package_id || null,
            assigned_employee_id: profile?.id,
            status: 'جديد',
            source: formattedSource,
            notes: form.notes || null,
            sales_agent_submitted: false,
          })
          .select('id')
          .single();
        if (err) throw err;
        customerId = data.id;
      }

      // Upload documents
      const docTypeKey: Record<string, string> = {
        'جواز سفر': 'passport',
        'جواز السفر': 'passport',
        'بطاقة رقم قومي': 'national_id',
        'البطاقة الشخصية': 'national_id',
        'صورة شخصية': 'personal_photo',
        'تأشيرة': 'visa',
        'مستند إضافي': 'extra_doc',
      };
      const uploadPromises = docTypes.map(async (d) => {
        const doc = docUploads[d.id];
        if (!doc.file) return;
        const ext = (doc.file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
        const safeDocType = docTypeKey[d.id] || 'document';
        const filePath = `${customerId}/${Date.now()}_${safeDocType}.${ext}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, doc.file);
        if (upErr) {
          console.error(`Error uploading document ${d.id}:`, upErr);
          return;
        }
        await supabase.from('documents').insert({
          customer_id: customerId,
          uploaded_by: profile?.id || null,
          doc_type: d.id,
          file_path: filePath,
          file_name: doc.file.name,
          file_size: doc.file.size,
          status: 'مرفوع',
        });
      });
      await Promise.all(uploadPromises);

      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      const { error: err } = await supabase.from('customers').delete().eq('id', id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      alert('خطأ أثناء حذف العميل: ' + err.message);
    }
  };

  const handleInitiateSend = async (c: Customer) => {
    setCustomerToSend(c);
    setCheckingDocs(true);
    setSendNotes('');
    setShowSendModal(true);
    setHasPassport(false);
    setHasNationalId(false);
    setHasPhoto(false);
    
    try {
      const { data: docs } = await supabase
        .from('documents')
        .select('doc_type')
        .eq('customer_id', c.id);
      
      const types = (docs || []).map((d: any) => d.doc_type);
      setHasPassport(types.includes('جواز سفر'));
      setHasNationalId(types.includes('بطاقة رقم قومي'));
      setHasPhoto(types.includes('صورة شخصية'));
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingDocs(false);
    }
  };

  const handleSendToCRM = async () => {
    if (!customerToSend) return;
    const c = customerToSend;
    setSubmittingId(c.id);
    try {
      const { error: err } = await supabase
        .from('customers')
        .update({ sales_agent_submitted: true })
        .eq('id', c.id);
      
      if (err) throw err;

      // Add a timeline event with entered notes
      await supabase.from('workflow_timeline').insert({
        customer_id: c.id,
        stage: 'crm',
        stage_label: 'العملاء CRM',
        department: 'المبيعات',
        employee_id: profile?.id || null,
        status: 'مكتمل',
        notes: sendNotes || 'تم تقديم ملف العميل ونقله إلى CRM بواسطة مندوب المبيعات',
      });

      // Send notification to sales managers
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .in('role', ['super_admin', 'مالك النظام', 'مدير النظام', 'مدير المبيعات']);
      
      if (managers && managers.length > 0) {
        const notifs = managers.map(m => ({
          employee_id: m.id,
          type: 'new_customer',
          title: 'عميل جديد مضاف من مندوب مبيعات',
          body: `قام المندوب ${profile?.name} بإضافة العميل الجديد ${c.name} إلى نظام CRM.`,
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifs);
      }

      setShowSendModal(false);
      setCustomerToSend(null);
      loadData();
    } catch (err: any) {
      alert('حدث خطأ أثناء إرسال العميل: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">بوابة مندوب المبيعات</h2>
          <p className="section-subtitle">إضافة العملاء والملفات وتحويلهم إلى نظام CRM لمتابعتهم</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-gold">
          <Plus size={16} /> إضافة عميل جديد
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-5 py-2.5 font-bold text-xs transition-all border-b-2 ${
            isDrafts
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          العملاء المضافون (مسودات) ({drafts.length})
        </button>
        {isSuperOrAdmin && (
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-5 py-2.5 font-bold text-xs transition-all border-b-2 ${
              !isDrafts
                ? 'border-gold-500 text-gold-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            العملاء المرسلون لـ CRM ({submitted.length})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table text-right">
              <thead>
                <tr>
                  <th>الاسم بالكامل</th>
                  <th>الهاتف</th>
                  <th>نوع الخدمة</th>
                  <th>الباقة المطلوبة</th>
                  <th>تاريخ الإضافة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {(isDrafts ? drafts : submitted).map((c) => (
                  <tr key={c.id} className="hover:bg-navy-50/30 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-navy flex items-center justify-center text-white font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{c.name}</span>
                            {c.employees?.name && (
                              <span className="text-[10px] text-gold-600 bg-gold-50 border border-gold-200/60 px-1.5 py-0.5 rounded">
                                بواسطة: {c.employees.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td dir="ltr" className="text-gray-600">{c.phone}</td>
                    <td>
                      <span className="badge bg-navy-50 text-navy-600">{c.service_type || 'غير محدد'}</span>
                    </td>
                    <td className="text-gray-600">{c.packages?.name || '—'}</td>
                    <td className="text-gray-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {isDrafts ? (
                          <>
                            <button
                              onClick={() => setViewCustomer(c)}
                              className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600"
                              title="عرض التفاصيل"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleInitiateSend(c)}
                              disabled={submittingId === c.id}
                              className="btn-gold py-1 px-3 text-[11px] flex items-center gap-1 shadow-xs"
                              title="تحويل العميل إلى نظام CRM"
                            >
                              {submittingId === c.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} />
                              )}
                              إرسال لـ CRM
                            </button>
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600"
                              title="تعديل"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={14} /> تم الإرسال لـ CRM
                            </span>
                            <button
                              onClick={() => setViewCustomer(c)}
                              className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600"
                              title="عرض التفاصيل"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(isDrafts ? drafts : submitted).length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      <AlertCircle className="mx-auto mb-2 opacity-30" size={32} />
                      لا يوجد عملاء مضافين في هذه القائمة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-navy-900">
                {editCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-xs">الاسم بالكامل <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="form-input pr-9 text-xs"
                      placeholder="الاسم الكامل"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label text-xs">رقم الهاتف <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="form-input pr-9 text-xs"
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label text-xs">رقم واتساب</label>
                  <div className="relative">
                    <Phone size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <input
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      className="form-input pr-9 text-xs"
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label text-xs">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="form-input pr-9 text-xs"
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-bold mb-2">نوع الخدمة <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {serviceTypes.map((s) => {
                    const active = form.service_type === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm({ ...form, service_type: s.value })}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          active
                            ? 'border-gold-500 bg-gold-50 text-navy-900'
                            : 'border-gray-100 text-gray-500 hover:border-navy-200'
                        }`}
                      >
                        <span className="text-xs font-bold">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-xs">الباقة المطلوبة</label>
                  <div className="relative">
                    <PackageIcon size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <select
                      value={form.requested_package_id}
                      onChange={(e) => setForm({ ...form, requested_package_id: e.target.value })}
                      className="form-input pr-9 text-xs"
                    >
                      <option value="">اختر الباقة</option>
                      {packages
                        .filter((p) => !form.service_type || p.type === form.service_type)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price.toLocaleString('ar-EG')} ج.م
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label text-xs">مصدر العميل</label>
                  <input
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="form-input text-xs"
                    placeholder="مثال: إعلان ممول، مندوب مبيعات..."
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs">ملاحظات العميل</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="form-input text-xs resize-none"
                  placeholder="ملاحظات تفصيلية..."
                />
              </div>

              {/* Document upload section */}
              <div className="pt-2 border-t border-gray-100">
                <label className="form-label text-xs font-bold mb-2">مستندات العميل (اختياري)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docTypes.slice(0, 3).map((d) => {
                    const doc = docUploads[d.id];
                    return (
                      <div key={d.id} className={`rounded-xl border p-3 transition-all ${doc.file ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-navy-900">{d.label}</span>
                          {doc.file && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </div>
                        {!doc.file ? (
                          <button
                            type="button"
                            onClick={() => fileRefs.current[d.id]?.click()}
                            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 flex flex-col items-center gap-1 text-gray-400 hover:border-gold-400 hover:text-gold-600 transition-all"
                          >
                            <Upload size={14} />
                            <span className="text-[10px] font-semibold">اضغط لرفع الملف</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-gray-600 truncate flex-1 bg-white rounded p-1 border border-gray-100">{doc.file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleFileSelect(d.id, null)}
                              className="p-1 rounded hover:bg-red-50 text-red-500"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <input
                          ref={(el) => { fileRefs.current[d.id] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileSelect(d.id, e.target.files?.[0] || null)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gold flex-1 justify-center text-xs py-2.5"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'حفظ العميل'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline flex-1 justify-center text-xs py-2.5"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send to CRM Modal */}
      {showSendModal && customerToSend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">
                تحويل العميل إلى نظام CRM
              </h3>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-navy-50 rounded-xl p-4 border border-navy-100 space-y-2">
                <p className="text-xs text-navy-900 font-bold">العميل: {customerToSend.name}</p>
                <p className="text-[11px] text-gray-500">نوع الخدمة: {customerToSend.service_type}</p>
              </div>

              {checkingDocs ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
                  <span className="text-xs text-gray-500">جاري التحقق من المستندات المرفوعة...</span>
                </div>
              ) : (
                <>
                  {/* Documents status list */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-700">حالة المستندات الأساسية للعميل:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`p-2.5 rounded-lg border text-center flex flex-col items-center gap-1 ${
                        hasPassport ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
                      }`}>
                        <span className="text-[10px] font-bold">جواز سفر</span>
                        {hasPassport ? <CheckCircle2 size={14} /> : <X size={14} />}
                      </div>

                      <div className={`p-2.5 rounded-lg border text-center flex flex-col items-center gap-1 ${
                        hasNationalId ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
                      }`}>
                        <span className="text-[10px] font-bold">بطاقة شخصية</span>
                        {hasNationalId ? <CheckCircle2 size={14} /> : <X size={14} />}
                      </div>

                      <div className={`p-2.5 rounded-lg border text-center flex flex-col items-center gap-1 ${
                        hasPhoto ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
                      }`}>
                        <span className="text-[10px] font-bold">صورة شخصية</span>
                        {hasPhoto ? <CheckCircle2 size={14} /> : <X size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Warning / Success messages */}
                  {hasPassport && hasNationalId && hasPhoto ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="flex-shrink-0" />
                      <p>معلومات ومستندات العميل مكتملة وجاهزة للتحويل إلى CRM.</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="flex-shrink-0 text-amber-600" />
                        <p className="font-bold">تنبيه: المستندات غير مكتملة</p>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        لم يقم المندوب برفع كافة المستندات (ناقصة جواز سفر، أو بطاقة شخصية، أو صورة شخصية).
                        <br />
                        <strong>لإرسال العميل الآن، يرجى كتابة ملاحظة أو تفاصيل الاتفاق / المكالمة (إجباري).</strong>
                      </p>
                    </div>
                  )}

                  {/* Notes Textarea */}
                  <div>
                    <label className="form-label text-xs font-bold mb-1 flex items-center gap-1">
                      ملاحظات التحويل / تفاصيل المكالمة
                      {!(hasPassport && hasNationalId && hasPhoto) && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={sendNotes}
                      onChange={(e) => setSendNotes(e.target.value)}
                      rows={3}
                      className="form-input text-xs resize-none"
                      placeholder={
                        hasPassport && hasNationalId && hasPhoto
                          ? "ملاحظات إضافية اختيارية..."
                          : "اكتب تفاصيل الاتفاق أو ملخص المكالمة هنا (5 أحرف على الأقل)..."
                      }
                      required={!(hasPassport && hasNationalId && hasPhoto)}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={handleSendToCRM}
                      disabled={
                        submittingId !== null ||
                        (!(hasPassport && hasNationalId && hasPhoto) && sendNotes.trim().length < 5)
                      }
                      className="btn-gold flex-1 justify-center text-xs py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submittingId ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        'تأكيد الإرسال لـ CRM'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSendModal(false)}
                      className="btn-outline flex-1 justify-center text-xs py-2.5"
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* View Customer Details Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl" onClick={() => setViewCustomer(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-navy p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                  {viewCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{viewCustomer.name}</h3>
                  <p className="text-[10px] text-gold-300">تفاصيل بيانات العميل</p>
                </div>
              </div>
              <button onClick={() => setViewCustomer(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><User size={11} /> الاسم بالكامل</p>
                  <p className="font-bold text-navy-900">{viewCustomer.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Phone size={11} /> رقم الهاتف</p>
                  <p className="font-bold text-navy-900" dir="ltr">{viewCustomer.phone}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Phone size={11} /> رقم واتساب</p>
                  <p className="font-bold text-navy-900" dir="ltr">{viewCustomer.whatsapp || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Mail size={11} /> البريد الإلكتروني</p>
                  <p className="font-bold text-navy-900" dir="ltr">{viewCustomer.email || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><MapPin size={11} /> نوع الخدمة</p>
                  <span className="badge bg-navy-100 text-navy-800 font-bold">{viewCustomer.service_type || '—'}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><PackageIcon size={11} /> الباقة المطلوبة</p>
                  <p className="font-bold text-navy-900">{viewCustomer.packages?.name || '—'}</p>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><FileText size={11} /> ملاحظات إضافية</p>
                <p className="font-medium text-navy-900 whitespace-pre-line leading-relaxed">{viewCustomer.notes || 'لا توجد ملاحظات إضافية مضافة'}</p>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-navy-800 flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 bg-gold-500 rounded-full" /> المستندات المرفوعة للعميل
                </h4>
                {viewCustomerDocs.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">لا توجد مستندات مرفوعة لهذا العميل حالياً</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {viewCustomerDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={15} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-navy-900">{doc.doc_type}</p>
                          <p className="text-[10px] text-gray-400 truncate">{doc.file_name}</p>
                        </div>
                        <button
                          onClick={async () => {
                            const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
                            if (data) window.open(data.signedUrl);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                          title="عرض"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewCustomer(null)}
                className="btn-gold text-xs py-2 px-6"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
