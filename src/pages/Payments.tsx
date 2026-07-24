import { useEffect, useState, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Printer, Loader2, X, Wallet, Upload, Eye,
  Download, CheckCircle2, XCircle, FileText, Clock, Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Payment, PaymentMethod, Booking, PaymentProof } from '../types';
import { exportToExcel } from '../lib/export';

const emptyForm = {
  booking_id: '',
  customer_id: '',
  amount: '',
  payment_method: 'كاش' as PaymentMethod,
  payment_date: new Date().toISOString().split('T')[0],
  status: 'غير مدفوع' as Payment['status'],
  notes: '',
  payment_type: 'دفعة عادية',
};

const methods: PaymentMethod[] = ['كاش', 'تحويل بنكي', 'فودافون كاش', 'أقساط'];
const statusOptions: Payment['status'][] = ['غير مدفوع', 'مدفوع جزئياً', 'مدفوع بالكامل'];
const paymentTypes = ['دفعة عادية', 'دفع كامل', 'دفعة مقدمة', 'قسط', 'رسوم تأشيرة', 'رسوم إضافية', 'استرداد'];

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

interface PayRow extends Payment {
  payment_proofs?: PaymentProof[];
}

export default function Payments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PayRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [transferredFiles, setTransferredFiles] = useState<any[]>([]);
  const [opsTransferFile, setOpsTransferFile] = useState<any | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: payData }, { data: bkData }, { data: opsData }] = await Promise.all([
      supabase.from('payments').select('*, customers(*), bookings(*), user_profiles!payments_employee_id_fkey(*), payment_proofs(*)').order('payment_date', { ascending: false }),
      supabase.from('bookings').select('*, customers(*)').order('created_at', { ascending: false }),
      // Show all files that have EVER been in the accounts stage or beyond
      supabase.from('operation_files')
        .select('*, customer:customers(*), booking:bookings(*)')
        .in('workflow_stage', ['accounts', 'operations', 'visa', 'flight', 'ready', 'completed'])
        .order('created_at', { ascending: false }),
    ]);
    const allPayments = (payData as PayRow[]) || [];
    const allBookings = (bkData as Booking[]) || [];
    const rawFiles = (opsData || []) as any[];
    // Attach payments to each operation file via customer_id
    const filesWithPayments = rawFiles.map((f: any) => ({
      ...f,
      payments: allPayments.filter((p) => p.customer_id === f.customer_id),
    }));
    setPayments(allPayments);
    setBookings(allBookings);
    setTransferredFiles(filesWithPayments);
    setLoading(false);
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (p: PayRow) => {
    setForm({
      booking_id: p.booking_id || '',
      customer_id: p.customer_id || '',
      amount: String(p.amount),
      payment_method: p.payment_method,
      payment_date: p.payment_date,
      status: p.status,
      notes: p.notes || '',
      payment_type: p.payment_type || 'دفعة عادية',
    });
    setEditId(p.id); setShowModal(true);
  };

  const onBookingChange = (bookingId: string) => {
    const bk = bookings.find(b => b.id === bookingId);
    setForm({ ...form, booking_id: bookingId, customer_id: bk?.customer_id || '' });
  };

  const syncBookingPayment = async (bookingId: string, deltaAmount: number, isDelete: boolean) => {
    const bk = bookings.find(b => b.id === bookingId);
    if (!bk) return;
    const currentPaid = Number(bk.paid_amount || 0);
    const total = Number(bk.total_amount || 0);
    let newPaid: number;
    if (isDelete) newPaid = Math.max(0, currentPaid - deltaAmount);
    else if (editId) newPaid = currentPaid - (Number(payments.find(p => p.id === editId)?.amount || 0)) + deltaAmount;
    else newPaid = currentPaid + deltaAmount;
    let status: Payment['status'] = 'غير مدفوع';
    if (newPaid >= total && total > 0) status = 'مدفوع بالكامل';
    else if (newPaid > 0) status = 'مدفوع جزئياً';
    await supabase.from('bookings').update({ paid_amount: newPaid, payment_status: status }).eq('id', bookingId);
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, paid_amount: newPaid, payment_status: status as Payment['status'] } : b));
  };

  const handleSave = async () => {
    if (!form.amount || !form.payment_date) return;
    setSaving(true);
    let transactionNumber: string | null = null;
    if (form.customer_id && !editId) {
      const { data: cust } = await supabase.from('customers').select('client_code').eq('id', form.customer_id).maybeSingle();
      if (cust?.client_code) {
        const { data: code } = await supabase.rpc('generate_sub_code', { p_client_code: cust.client_code, p_prefix: 'TXN' });
        transactionNumber = code as string;
      }
    }
    const payload = {
      booking_id: form.booking_id || null,
      customer_id: form.customer_id || null,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      status: form.status,
      notes: form.notes || null,
      transaction_number: transactionNumber,
      payment_type: form.payment_type,
    };
    if (editId) {
      const { data, error } = await supabase.from('payments').update(payload).eq('id', editId).select('*, customers(*), bookings(*), user_profiles!payments_employee_id_fkey(*), payment_proofs(*)').single();
      if (error) { alert(`خطأ في تحديث الدفعة: ${error.message}`); setSaving(false); return; }
      if (data) {
        setPayments(payments.map(p => p.id === editId ? (data as PayRow) : p));
        if (form.booking_id) await syncBookingPayment(form.booking_id, parseFloat(form.amount), false);
      }
    } else {
      const { data, error } = await supabase.from('payments').insert(payload).select('*, customers(*), bookings(*), user_profiles!payments_employee_id_fkey(*), payment_proofs(*)').single();
      if (error) { alert(`خطأ في إضافة الدفعة: ${error.message}`); setSaving(false); return; }
      if (data) {
        setPayments([data as PayRow, ...payments]);
        if (form.booking_id) await syncBookingPayment(form.booking_id, parseFloat(form.amount), false);
      }
    }
    setSaving(false);
    setShowModal(false);
    // Reload to refresh transferred files' payment counts
    load();
  };

  const handleDelete = async (p: PayRow) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;
    if (p.booking_id) await syncBookingPayment(p.booking_id, p.amount, true);
    await supabase.from('payments').delete().eq('id', p.id);
    setPayments(payments.filter(x => x.id !== p.id));
  };

  const uploadProof = async (file: File) => {
    if (!selectedPayment) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('الملفات المدعومة: PDF, JPG, PNG فقط');
      return;
    }
    setUploading(true);
    const filePath = `payment-proofs/${selectedPayment.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setUploading(false); return; }
    const { data } = await supabase
      .from('payment_proofs')
      .insert({ payment_id: selectedPayment.id, file_path: filePath, file_name: file.name, file_size: file.size, status: 'مرفوع', uploaded_by: profile?.id || null })
      .select('*')
      .single();
    if (data) {
      const updated = { ...selectedPayment, payment_proofs: [...(selectedPayment.payment_proofs || []), data as PaymentProof] };
      setSelectedPayment(updated);
      setPayments(payments.map(p => p.id === selectedPayment.id ? updated : p));
    }
    setUploading(false);
  };

  const approvePayment = async (p: PayRow) => {
    const { data } = await supabase
      .from('payments')
      .update({
        approval_status: 'معتمد',
        approved_by: profile?.id || null,
        approved_at: new Date().toISOString(),
        status: 'مدفوع بالكامل',
      })
      .eq('id', p.id)
      .select('*, customers(*), bookings(*), user_profiles!payments_employee_id_fkey(*), payment_proofs(*)')
      .single();
    if (data) {
      setPayments(payments.map(x => x.id === p.id ? (data as PayRow) : x));
      setSelectedPayment(data as PayRow);
    }
  };

  const rejectPayment = async (p: PayRow) => {
    if (!rejectionReason.trim()) { alert('يرجى كتابة سبب الرفض'); return; }
    const { data } = await supabase
      .from('payments')
      .update({
        approval_status: 'مرفوض',
        rejection_reason: rejectionReason,
      })
      .eq('id', p.id)
      .select('*, customers(*), bookings(*), user_profiles!payments_employee_id_fkey(*), payment_proofs(*)')
      .single();
    if (data) {
      setPayments(payments.map(x => x.id === p.id ? (data as PayRow) : x));
      setSelectedPayment(data as PayRow);
      setRejectionReason('');
    }
  };

  const deleteProof = async (proof: PaymentProof) => {
    await supabase.storage.from('documents').remove([proof.file_path]);
    await supabase.from('payment_proofs').delete().eq('id', proof.id);
    if (selectedPayment) {
      const updated = { ...selectedPayment, payment_proofs: (selectedPayment.payment_proofs || []).filter(x => x.id !== proof.id) };
      setSelectedPayment(updated);
      setPayments(payments.map(p => p.id === selectedPayment.id ? updated : p));
    }
  };

  const printReceipt = (p: PayRow) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>إيصال دفع</title>
      <style>
        body{font-family:'Cairo',sans-serif;padding:30px;color:#0c224f;}
        .logo{font-size:24px;font-weight:900;text-align:center;margin-bottom:5px;}
        .sub{text-align:center;color:#d4a017;font-size:12px;margin-bottom:20px;}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #ddd;font-size:14px;}
        .label{color:#666;}.val{font-weight:bold;}
        .total{margin-top:20px;padding:15px;background:#f9f9f9;border-radius:10px;text-align:center;font-size:20px;font-weight:900;}
        .foot{margin-top:30px;text-align:center;font-size:11px;color:#999;}
      </style></head><body>
      <div class="logo">PROMISE</div><div class="sub">بروميس للسياحة والسفر</div>
      <h3 style="text-align:center;margin-bottom:20px;">إيصال استلام دفعة</h3>
      <div class="row"><span class="label">رقم العملية</span><span class="val">#${p.id.slice(0, 8)}</span></div>
      <div class="row"><span class="label">اسم العميل</span><span class="val">${p.customers?.name || '—'}</span></div>
      <div class="row"><span class="label">نوع العملية</span><span class="val">${p.payment_type || 'دفعة عادية'}</span></div>
      <div class="row"><span class="label">رقم الحجز</span><span class="val">${p.booking_id ? '#' + p.booking_id.slice(0, 8) : '—'}</span></div>
      <div class="row"><span class="label">طريقة الدفع</span><span class="val">${p.payment_method}</span></div>
      <div class="row"><span class="label">التاريخ</span><span class="val">${new Date(p.payment_date).toLocaleDateString('ar-EG')}</span></div>
      <div class="row"><span class="label">الحالة</span><span class="val">${p.status}</span></div>
      <div class="total">${fmt(p.amount)} ج.م</div>
      <div class="foot">شكراً لتعاملكم مع Promise Travel<br>هذا الإيصال صالح كدفعة وليس تأكيداً نهائياً للحجز</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const handleExport = () => {
    exportToExcel(payments.map((p, i) => ({
      '#': i + 1, 'العميل': p.customers?.name || '—', 'نوع العملية': p.payment_type || 'دفعة عادية',
      'رقم الحجز': p.booking_id?.slice(0, 8) || '—',
      'المبلغ': p.amount, 'الطريقة': p.payment_method, 'التاريخ': new Date(p.payment_date).toLocaleDateString('ar-EG'),
      'الحالة': p.status, 'الاعتماد': p.approval_status || 'بانتظار الاعتماد',
    })), 'المدفوعات');
  };

  const filtered = payments.filter(p => {
    if (filterApproval && p.approval_status !== filterApproval) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.customers?.name?.toLowerCase().includes(q) && !(p.transaction_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const approvalBadge = (status?: string) => {
    if (status === 'معتمد') return <span className="badge bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1 w-fit"><CheckCircle2 size={11} /> معتمد</span>;
    if (status === 'مرفوض') return <span className="badge bg-red-100 text-red-700 text-xs flex items-center gap-1 w-fit"><XCircle size={11} /> مرفوض</span>;
    return <span className="badge bg-amber-100 text-amber-700 text-xs flex items-center gap-1 w-fit"><Clock size={11} /> بانتظار الاعتماد</span>;
  };

  // Installment summary for selected payment
  const installmentInfo = (() => {
    if (!selectedPayment?.booking_id) return null;
    const bk = bookings.find(b => b.id === selectedPayment.booking_id);
    if (!bk) return null;
    const total = Number(bk.total_amount || 0);
    const paid = Number(bk.paid_amount || 0);
    const remaining = total - paid;
    const allPayments = payments.filter(p => p.booking_id === bk.id && p.approval_status === 'معتمد');
    const installmentsPaid = allPayments.filter(p => p.payment_type === 'قسط').length;
    const totalInstallments = allPayments.length + payments.filter(p => p.booking_id === bk.id && p.approval_status !== 'معتمد' && p.payment_type === 'قسط').length;
    const nextInstallmentDate = payments
      .filter(p => p.booking_id === bk.id && p.payment_type === 'قسط' && p.approval_status !== 'معتمد')
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date))[0]?.payment_date;
    return { total, paid, remaining, installmentsPaid, totalInstallments, nextInstallmentDate, currentAmount: selectedPayment.amount };
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">المدفوعات والحسابات</h2>
          <p className="section-subtitle">إدارة الدفعات، إثبات الدفع، واعتماد الحسابات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-outline">تصدير</button>
          <button onClick={openAdd} className="btn-gold"><Plus size={16} /> إضافة دفعة</button>
        </div>
      </div>

      {/* Transferred Files to Accounts (all files at accounts stage or beyond) */}
      {transferredFiles.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-gold-50/50 to-white rounded-2xl border border-gold-300 p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gold-100 flex items-center justify-center text-navy-900 font-bold">
                2➜
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                  📥 ملفات قسم الحسابات والمراحل اللاحقة ({transferredFiles.length})
                </h3>
                <p className="text-xs text-gray-500">جميع الملفات المحوّلة للحسابات — يبقى العميل مرئياً في جميع المراحل</p>
              </div>
            </div>
            <button onClick={load} className="text-xs text-navy-700 bg-navy-50 px-3 py-1 rounded-full font-medium border border-navy-200 hover:bg-navy-100 transition-colors">
              🔄 تحديث
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {transferredFiles.map((file) => {
              const stageLabels: Record<string, { label: string; color: string; bg: string }> = {
                accounts: { label: '💰 الحسابات', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' },
                operations: { label: '⚙️ التشغيل', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' },
                visa: { label: '🛂 التأشيرة', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-300' },
                flight: { label: '✈️ الطيران', color: 'text-cyan-700', bg: 'bg-cyan-100 border-cyan-300' },
                ready: { label: '✅ جاهز للسفر', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' },
                completed: { label: '🏁 مكتمل', color: 'text-gray-700', bg: 'bg-gray-100 border-gray-300' },
              };
              const stageMeta = stageLabels[file.workflow_stage] || stageLabels.accounts;
              // Compute payment totals from linked payments
              const filePayments: any[] = file.payments || [];
              const totalPaid = filePayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
              const bookingTotal = Number(file.booking?.total_amount || 0);
              const paidPct = bookingTotal > 0 ? Math.min(100, Math.round((totalPaid / bookingTotal) * 100)) : 0;

              return (
                <div key={file.id} className="bg-white rounded-xl p-4 shadow-sm border border-gold-200 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 text-sm">{file.customer?.name || 'عميل'}</span>
                      {file.customer?.client_code && (
                        <span className="text-[11px] font-mono text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                          {file.customer.client_code}
                        </span>
                      )}
                    </div>
                    {/* Stage badge */}
                    <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stageMeta.bg} ${stageMeta.color}`}>
                      {stageMeta.label}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {file.customer?.phone && <p>📱 الهاتف: <span dir="ltr" className="font-semibold text-navy-800">{file.customer.phone}</span></p>}
                      {file.customer?.service_type && <p>✈️ الخدمة: <span className="font-semibold text-navy-800">{file.customer.service_type}</span></p>}
                      {/* Payment summary */}
                      {(totalPaid > 0 || bookingTotal > 0) && (
                        <div className="bg-navy-50 rounded-lg p-2 mt-1">
                          <p className="text-navy-700 font-semibold text-[11px]">
                            💳 مدفوع: {totalPaid.toLocaleString('ar-EG')} ج.م
                            {bookingTotal > 0 && <span className="text-gray-500"> / {bookingTotal.toLocaleString('ar-EG')} ج.م ({paidPct}%)</span>}
                          </p>
                          {bookingTotal > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div className="bg-gold-500 h-1.5 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                            </div>
                          )}
                          <p className="text-[10px] text-gray-500 mt-0.5">{filePayments.length} دفعة مسجّلة</p>
                        </div>
                      )}
                      {file.notes && (
                        <div className="mt-1 bg-amber-50/80 p-2 rounded-lg border border-amber-200 text-[11px] text-navy-900">
                          <span className="font-bold text-amber-800 block">📝 ملاحظات:</span>
                          <p className="line-clamp-2 leading-relaxed">{file.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                    <button
                      onClick={() => {
                        setForm({ ...emptyForm, customer_id: file.customer_id, booking_id: file.booking_id || '' });
                        setShowModal(true);
                      }}
                      className="btn-gold text-[11px] py-1.5 flex-1 justify-center gap-1 shadow-xs"
                    >
                      <Plus size={12} /> إضافة دفعة
                    </button>
                    {/* Only show transfer to ops if still in accounts stage */}
                    {file.workflow_stage === 'accounts' && (
                      <button
                        onClick={() => setOpsTransferFile(file)}
                        className="btn-outline text-[11px] py-1.5 flex-1 justify-center gap-1 hover:border-gold-500 hover:bg-gold-50"
                      >
                        🚀 تحويل للتشغيل
                      </button>
                    )}
                    {file.workflow_stage !== 'accounts' && (
                      <span className="text-[11px] text-gray-500 py-1.5 flex-1 text-center">
                        محوّل ✔
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعميل أو رقم العملية..." className="form-input pr-9" />
        </div>
        <select value={filterApproval} onChange={(e) => setFilterApproval(e.target.value)} className="form-input sm:w-48">
          <option value="">كل حالات الاعتماد</option>
          <option value="بانتظار الاعتماد">بانتظار الاعتماد</option>
          <option value="معتمد">معتمد</option>
          <option value="مرفوض">مرفوض</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">لا توجد دفعات مسجلة</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>رقم العملية</th><th>العميل</th><th>نوع العملية</th><th>المبلغ</th>
                <th>الطريقة</th><th>التاريخ</th><th>الحالة</th><th>الاعتماد</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="cursor-pointer hover:bg-gray-50/50" onClick={() => setSelectedPayment(p)}>
                  <td className="font-mono text-xs text-gray-500">#{p.id.slice(0, 8)}</td>
                  <td className="font-semibold text-gray-800">{p.customers?.name || '—'}</td>
                  <td><span className="badge bg-navy-50 text-navy-700 text-xs">{p.payment_type || 'دفعة عادية'}</span></td>
                  <td className="font-bold text-navy-900">{fmt(p.amount)} ج.م</td>
                  <td><span className="badge bg-gray-100 text-gray-600 text-xs">{p.payment_method}</span></td>
                  <td className="text-gray-500 text-sm">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</td>
                  <td>
                    <span className={`badge ${p.status === 'مدفوع بالكامل' ? 'bg-emerald-100 text-emerald-700' : p.status === 'مدفوع جزئياً' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                  </td>
                  <td>{approvalBadge(p.approval_status)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => printReceipt(p)} title="طباعة إيصال" className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600"><Printer size={15} /></button>
                      <button onClick={() => openEdit(p)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gold-50 text-gold-600"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(p)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل الدفعة' : 'إضافة دفعة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">الحجز المرتبط</label>
                <select value={form.booking_id} onChange={(e) => onBookingChange(e.target.value)} className="form-input">
                  <option value="">— بدون حجز —</option>
                  {bookings.map(b => <option key={b.id} value={b.id}>{b.customers?.name || 'حجز'} — {fmt(Number(b.total_amount || 0))} ج.م</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">نوع العملية المالية</label>
                <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })} className="form-input">
                  {paymentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المبلغ (ج.م) <span className="text-red-500">*</span></label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input" placeholder="5000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">طريقة الدفع</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })} className="form-input">
                    {methods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">تاريخ الدفع <span className="text-red-500">*</span></label>
                  <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">حالة الدفع</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Payment['status'] })} className="form-input">
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input min-h-[60px] resize-none" placeholder="ملاحظات إضافية" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.amount} className="btn-gold">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail / Approval Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedPayment(null); setRejectionReason(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-navy p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><Wallet size={22} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedPayment.customers?.name || '—'}</h3>
                    <p className="text-xs text-white/60 font-mono">#{selectedPayment.id.slice(0, 8)} · {selectedPayment.transaction_number || '—'}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedPayment(null); setRejectionReason(''); }} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Transaction details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'نوع العملية', value: selectedPayment.payment_type || 'دفعة عادية' },
                  { label: 'المبلغ', value: `${fmt(selectedPayment.amount)} ج.م` },
                  { label: 'طريقة الدفع', value: selectedPayment.payment_method },
                  { label: 'تاريخ العملية', value: new Date(selectedPayment.payment_date).toLocaleDateString('ar-EG') },
                  { label: 'الموظف المسجل', value: selectedPayment.user_profiles?.name || '—' },
                  { label: 'حالة العملية', value: selectedPayment.status },
                ].map(r => (
                  <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{r.label}</p>
                    <p className="text-sm font-semibold text-navy-900">{r.value}</p>
                  </div>
                ))}
              </div>

              {/* Approval status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-400 mb-1">حالة الاعتماد</p>
                  {approvalBadge(selectedPayment.approval_status)}
                  {selectedPayment.approved_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      اعتمد بواسطة: {selectedPayment.user_profiles?.name || '—'} · {new Date(selectedPayment.approved_at).toLocaleString('ar-EG')}
                    </p>
                  )}
                  {selectedPayment.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">سبب الرفض: {selectedPayment.rejection_reason}</p>
                  )}
                </div>
              </div>

              {/* Installment info */}
              {installmentInfo && selectedPayment.payment_type === 'قسط' && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><FileText size={15} className="text-blue-500" /> تفاصيل الأقساط</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'إجمالي الحجز', value: `${fmt(installmentInfo.total)} ج.م` },
                      { label: 'قيمة الدفعة الحالية', value: `${fmt(installmentInfo.currentAmount)} ج.م` },
                      { label: 'إجمالي المدفوع', value: `${fmt(installmentInfo.paid)} ج.م` },
                      { label: 'المتبقي', value: `${fmt(installmentInfo.remaining)} ج.م` },
                      { label: 'الأقساط المدفوعة', value: `${installmentInfo.installmentsPaid}` },
                      { label: 'القسط القادم', value: installmentInfo.nextInstallmentDate ? new Date(installmentInfo.nextInstallmentDate).toLocaleDateString('ar-EG') : '—' },
                    ].map(r => (
                      <div key={r.label} className="bg-white rounded-lg p-2.5">
                        <p className="text-xs text-gray-400">{r.label}</p>
                        <p className="text-sm font-bold text-navy-900">{r.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment proofs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2"><FileText size={15} className="text-gold-500" /> إثبات الدفع</h4>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-gold text-xs py-1.5 px-3">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> رفع مستند</>}
                  </button>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); e.target.value = ''; }} />
                </div>
                {(selectedPayment.payment_proofs || []).length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">لا توجد مستندات إثبات مرفوعة</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedPayment.payment_proofs || []).map(proof => (
                      <div key={proof.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><FileText size={16} className="text-red-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy-900 truncate">{proof.file_name}</p>
                          <p className="text-xs text-gray-500">رفع: {new Date(proof.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(proof.file_path, 3600); if (data) window.open(data.signedUrl); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500" title="عرض"><Eye size={14} /></button>
                        <button onClick={async () => { const { data } = await supabase.storage.from('documents').download(proof.file_path); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = proof.file_name; a.click(); } }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500" title="تحميل"><Download size={14} /></button>
                        <button onClick={() => deleteProof(proof)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="حذف"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval actions */}
              {selectedPayment.approval_status !== 'معتمد' && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button onClick={() => approvePayment(selectedPayment)} className="flex-1 btn-outline text-sm py-2.5 flex items-center justify-center gap-2 !text-emerald-700 !border-emerald-300 hover:!bg-emerald-50">
                      <CheckCircle2 size={16} /> اعتماد الدفع
                    </button>
                    <button onClick={() => { if (rejectionReason.trim()) rejectPayment(selectedPayment); else setRejectionReason(' '); }} className="flex-1 btn-outline text-sm py-2.5 flex items-center justify-center gap-2 !text-red-600 !border-red-300 hover:!bg-red-50">
                      <XCircle size={16} /> رفض الدفع
                    </button>
                  </div>
                  {rejectionReason !== '' && (
                    <div>
                      <label className="form-label">سبب الرفض <span className="text-red-500">*</span></label>
                      <textarea value={rejectionReason.trim()} onChange={(e) => setRejectionReason(e.target.value)} className="form-input resize-none" rows={2} placeholder="اكتب سبب رفض الدفع..." />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer file to Operations modal */}
      {opsTransferFile && (
        <TransferFileToOpsModal
          file={opsTransferFile}
          onClose={() => setOpsTransferFile(null)}
          onTransferred={() => {
            setOpsTransferFile(null);
            load();
          }}
        />
      )}
    </div>
  );
}

interface TransferFileOpsProps {
  file: any;
  onClose: () => void;
  onTransferred: () => void;
}

function TransferFileToOpsModal({ file, onClose, onTransferred }: TransferFileOpsProps) {
  const [opsEmployees, setOpsEmployees] = useState<{ id: string; name: string }[]>([]);
  const [targetEmpId, setTargetEmpId] = useState('');
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('employees').select('id, name, role').eq('is_active', true);
      const list = (data || []).map((e: any) => ({ id: e.id, name: `${e.name} (${e.role})` }));
      setOpsEmployees(list);
    })();
  }, []);

  const handleTransfer = async () => {
    if (!file?.id) {
      alert('خطأ: لم يتم العثور على الملف. حاول مجدداً.');
      return;
    }
    setTransferring(true);
    const updatedNotes = notes
      ? `${file.notes ? file.notes + ' | ' : ''}ملاحظات اعتماد قسم الحسابات: ${notes}`
      : file.notes;

    // Try update with financially_approved first, fallback without it
    let updateError: any = null;
    const { error: err1 } = await supabase
      .from('operation_files')
      .update({
        workflow_stage: 'operations',
        file_status: 'قيد التجهيز',
        financially_approved: true,
        assigned_to: targetEmpId || null,
        notes: updatedNotes,
      })
      .eq('id', file.id);

    if (err1) {
      // Retry without financially_approved in case column doesn't exist
      const { error: err2 } = await supabase
        .from('operation_files')
        .update({
          workflow_stage: 'operations',
          file_status: 'قيد التجهيز',
          assigned_to: targetEmpId || null,
          notes: updatedNotes,
        })
        .eq('id', file.id);
      updateError = err2;
    }

    if (updateError) {
      alert(`فشل التحويل للتشغيل: ${updateError.message}`);
      setTransferring(false);
      return;
    }

    if (file.customer_id) {
      await supabase.from('workflow_timeline').insert({
        customer_id: file.customer_id,
        booking_id: file.booking_id || null,
        stage: 'operations',
        stage_label: 'قسم التشغيل',
        department: 'الحسابات',
        employee_id: targetEmpId || null,
        status: 'مكتمل',
        notes: notes || 'تم اعتماد ملف العميل مالياً وتحويله من قسم الحسابات إلى التشغيل',
      });
    }

    if (targetEmpId) {
      await supabase.from('notifications').insert({
        employee_id: targetEmpId,
        type: 'task_assigned',
        title: 'ملف تشغيل جديد محول من قسم الحسابات',
        body: `العميل: ${file.customer?.name || '—'} - ملاحظات الحسابات: ${notes}`,
      });
    }

    setTransferring(false);
    onTransferred();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-gold-100 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 text-gold-600 border-b border-gray-100 pb-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-100 flex items-center justify-center text-navy-900 font-bold">
            3➜4
          </div>
          <div>
            <h3 className="font-bold text-navy-900 text-base">تحويل العميل من الحسابات إلى التشغيل</h3>
            <p className="text-xs text-gray-500">العميل: <span className="font-semibold text-navy-900">{file.customer?.name || '—'}</span></p>
          </div>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <label className="form-label font-bold text-navy-900 text-xs">اختر موظف قسم التشغيل المسؤول:</label>
            <select
              value={targetEmpId}
              onChange={(e) => setTargetEmpId(e.target.value)}
              className="form-input text-xs"
            >
              <option value="">— جميع فريق قسم التشغيل —</option>
              {opsEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label font-bold text-navy-900 text-xs">ملاحظات وتعليمات التحويل للتشغيل:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input text-xs resize-none"
              rows={3}
              placeholder="اكتب ملاحظات الاعتماد المالي والدفعات وقسم الفنادق..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTransfer}
            disabled={transferring}
            className="btn-gold flex-1 justify-center text-xs py-2.5"
          >
            {transferring ? 'جارٍ التحويل...' : 'تأكيد الاعتماد المالي والتحويل للتشغيل'}
          </button>
          <button
            onClick={onClose}
            className="btn-outline flex-1 justify-center text-xs py-2.5"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
