import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, CalendarClock, AlertCircle, CheckCircle2, Clock, Search, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, FinancialInstallment } from '../types';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';

const emptyForm = {
  customer_id: '',
  amount: '',
  due_date: '',
  status: 'مستحق' as FinancialInstallment['status'],
  notes: '',
};

const emptyPaymentForm = {
  payment_method: 'كاش',
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');
const today = new Date().toISOString().split('T')[0];

export default function Installments() {
  const [items, setItems] = useState<FinancialInstallment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [selectedInstallment, setSelectedInstallment] = useState<FinancialInstallment | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: instData }, { data: custData }] = await Promise.all([
        supabase.from('financial_installments').select('*, customers(*)').order('due_date', { ascending: true }),
        supabase.from('customers').select('*').order('name', { ascending: true }),
      ]);
      setItems((instData as FinancialInstallment[]) || []);
      setCustomers((custData as Customer[]) || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (i: FinancialInstallment) => {
    setForm({
      customer_id: i.customer_id,
      amount: String(i.amount),
      due_date: i.due_date,
      status: i.status,
      notes: i.notes || '',
    });
    setEditId(i.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.customer_id || !form.amount || !form.due_date) return;
    setSaving(true);
    
    const payload = {
      customer_id: form.customer_id,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      status: form.status,
      notes: form.notes,
    };
    
    if (editId) {
      const { data, error } = await supabase.from('financial_installments').update(payload).eq('id', editId).select('*, customers(*)').single();
      if (error) { alert(error.message); }
      else if (data) setItems(items.map(x => x.id === editId ? (data as FinancialInstallment) : x));
    } else {
      const { data, error } = await supabase.from('financial_installments').insert(payload).select('*, customers(*)').single();
      if (error) { alert(error.message); }
      else if (data) setItems([...items, data as FinancialInstallment]);
    }
    setSaving(false); setShowModal(false);
  };

  const openPayment = (i: FinancialInstallment) => {
    setSelectedInstallment(i);
    setPaymentForm(emptyPaymentForm);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedInstallment || !paymentForm.payment_date || !paymentForm.payment_method) return;
    setSaving(true);
    
    // 1. Create a payment record in payments table
    const paymentPayload = {
      customer_id: selectedInstallment.customer_id,
      amount: selectedInstallment.amount,
      payment_method: paymentForm.payment_method,
      payment_date: paymentForm.payment_date,
      status: 'مدفوع بالكامل',
      notes: paymentForm.notes,
      payment_type: 'قسط',
    };
    
    const { data: paymentRecord, error: payErr } = await supabase.from('payments').insert(paymentPayload).select('id').single();
    if (payErr) {
      alert('خطأ في تسجيل الدفعة: ' + payErr.message);
      setSaving(false);
      return;
    }
    
    // 2. Update installment status and link payment
    const { data: updatedInst, error: instErr } = await supabase
      .from('financial_installments')
      .update({ status: 'مدفوع', payment_id: paymentRecord.id })
      .eq('id', selectedInstallment.id)
      .select('*, customers(*)')
      .single();
      
    if (instErr) {
      alert('خطأ في تحديث القسط: ' + instErr.message);
    } else if (updatedInst) {
      setItems(items.map(x => x.id === selectedInstallment.id ? (updatedInst as FinancialInstallment) : x));
      alert('تم تسجيل السداد بنجاح!');
    }
    
    setSaving(false);
    setShowPaymentModal(false);
  };

  const handleDelete = async (id: string) => {
    // Intercept deletion to create approval request instead of direct delete
    const inst = items.find(i => i.id === id);
    if (!inst) return;
    
    const reason = prompt('يرجى إدخال سبب إلغاء/حذف هذا القسط (سيتطلب ذلك موافقة الإدارة):');
    if (!reason) return;
    
    try {
      const { error } = await supabase.from('approval_requests').insert({
        type: 'cancel_installment',
        record_id: id,
        record_type: 'financial_installments',
        reason: reason,
        status: 'pending',
        record_details: inst
      });
      
      if (error) throw error;
      alert('تم إرسال طلب حذف/إلغاء القسط إلى الإدارة للاعتماد.');
    } catch (err: any) {
      alert('حدث خطأ أثناء إرسال الطلب: ' + err.message);
    }
  };

  const filteredItems = items.filter(i => {
    if (!searchTerm) return true;
    return i.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           i.customers?.client_code?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const dueToday = items.filter(i => i.due_date === today && i.status === 'مستحق');
  const overdue = items.filter(i => i.due_date < today && i.status === 'مستحق');
  
  // Calculate due soon (within 3 days)
  const dueSoonDate = new Date();
  dueSoonDate.setDate(dueSoonDate.getDate() + 3);
  const dueSoonString = dueSoonDate.toISOString().split('T')[0];
  const dueSoon = items.filter(i => i.due_date > today && i.due_date <= dueSoonString && i.status === 'مستحق');
  
  const active = items.filter(i => i.status === 'مستحق');

  const handleExportExcel = () => {
    exportToExcel(filteredItems.map((i, idx) => ({
      '#': idx + 1, 'العميل': i.customers?.name || '—', 'قيمة القسط': i.amount, 
      'تاريخ الاستحقاق': i.due_date ? new Date(i.due_date).toLocaleDateString('ar-EG') : '—', 
      'الحالة': i.status, 'ملاحظات': i.notes || ''
    })), 'الأقساط');
  };

  const handleExportPDF = () => {
    const headers = ['#', 'العميل', 'قيمة القسط', 'تاريخ الاستحقاق', 'الحالة', 'ملاحظات'];
    const rows = filteredItems.map((i, idx) => [
      idx + 1,
      i.customers?.name || '—',
      i.amount,
      i.due_date ? new Date(i.due_date).toLocaleDateString('ar-EG') : '—',
      i.status,
      i.notes || ''
    ]);
    exportToPDF('تقرير الأقساط', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">إدارة الأقساط</h2>
          <p className="section-subtitle">تتبع الدفعات المستحقة وتواريخها</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="بحث باسم أو كود العميل..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input text-sm pr-9 w-64"
            />
          </div>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">Excel</button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50">PDF</button>
          <button onClick={openAdd} className="btn-gold"><Plus size={16} /> إضافة قسط</button>
        </div>
      </div>

      {/* Alert banners */}
      <div className="flex flex-col gap-3">
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">🔔 يوجد أقساط متأخرة تحتاج إلى متابعة ({overdue.length})</p>
              <div className="mt-2 space-y-1">
                {overdue.slice(0, 3).map(d => (
                  <div key={d.id} className="text-red-700 text-sm bg-red-100/50 p-2 rounded flex justify-between gap-4">
                    <span>{d.customers?.name}</span>
                    <span className="font-bold">{fmt(d.amount)} ج.م (تاريخ الاستحقاق: {new Date(d.due_date).toLocaleDateString('ar-EG')})</span>
                  </div>
                ))}
                {overdue.length > 3 && <p className="text-red-600 text-xs">و {overdue.length - 3} آخرين...</p>}
              </div>
            </div>
          </div>
        )}
        
        {dueToday.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <CalendarClock size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">🔔 أقساط مستحقة اليوم ({dueToday.length})</p>
              <p className="text-amber-700 text-sm mt-1">{dueToday.map(d => d.customers?.name).join('، ')}</p>
            </div>
          </div>
        )}

        {dueSoon.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <Clock size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-800">🔔 أقساط قريبة الاستحقاق ({dueSoon.length})</p>
              <p className="text-blue-700 text-sm mt-1">{dueSoon.map(d => d.customers?.name).join('، ')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">أقساط نشطة</p><p className="text-2xl font-black text-navy-900 mt-1">{active.length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700"><Clock size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">مستحقة اليوم</p><p className="text-2xl font-black text-amber-600 mt-1">{dueToday.length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><CalendarClock size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">متأخرة</p><p className="text-2xl font-black text-red-600 mt-1">{overdue.length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><AlertCircle size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">مكتملة / مسددة</p><p className="text-2xl font-black text-emerald-600 mt-1">{items.filter(i => i.status === 'مدفوع').length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={22} /></div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>رقم القسط</th><th>العميل</th>
                <th>قيمة القسط</th><th>تاريخ الاستحقاق</th>
                <th>الحالة</th><th>ملاحظات</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-10">لا توجد أقساط مسجلة</td></tr>
              ) : filteredItems.map(i => (
                <tr key={i.id} className={i.status === 'متأخر' ? 'bg-red-50/30' : ''}>
                  <td className="font-mono text-xs text-gray-500">#{i.id.slice(0, 8)}</td>
                  <td>
                    <p className="font-semibold text-gray-800">{i.customers?.name || '—'}</p>
                    <p className="text-xs text-gray-500">{i.customers?.client_code || '—'}</p>
                  </td>
                  <td className="font-bold text-navy-900">{fmt(i.amount)} ج.م</td>
                  <td className="text-gray-800">{i.due_date ? new Date(i.due_date).toLocaleDateString('ar-EG') : '—'}</td>
                  <td>
                    <span className={`badge ${i.status === 'مدفوع' ? 'bg-emerald-100 text-emerald-700' : i.status === 'متأخر' ? 'bg-red-100 text-red-700' : i.status === 'ملغي' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                      {i.status === 'مدفوع' ? <CheckCircle2 size={11} className="inline ml-1" /> : null}{i.status}
                    </span>
                  </td>
                  <td className="text-gray-500 text-sm max-w-[200px] truncate">{i.notes || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {(i.status === 'مستحق' || i.status === 'متأخر') ? (
                        <button onClick={() => openPayment(i)} className="btn-gold py-1 px-2 text-xs flex items-center gap-1">
                          <DollarSign size={14} /> تسجيل سداد
                        </button>
                      ) : null}
                      <button onClick={() => openEdit(i)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gold-50 text-gold-600"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(i.id)} title="إلغاء / طلب حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Installment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل القسط' : 'إضافة قسط جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">العميل <span className="text-red-500">*</span></label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="form-input">
                  <option value="">— اختر العميل —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.client_code ? `(${c.client_code})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">قيمة القسط (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input" placeholder="5000" />
                </div>
                <div>
                  <label className="form-label">تاريخ الاستحقاق <span className="text-red-500">*</span></label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="form-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">حالة القسط <span className="text-red-500">*</span></label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="form-input">
                    <option value="مستحق">مستحق</option>
                    <option value="مدفوع">مدفوع</option>
                    <option value="متأخر">متأخر</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">ملاحظات</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input" placeholder="أضف أي ملاحظات هنا..." />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.customer_id || !form.amount || !form.due_date} className="btn-gold">{saving ? 'جارٍ الحفظ...' : 'حفظ القسط'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-navy-900">تسجيل سداد قسط</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="text-sm text-gray-500 mb-1">بيانات القسط:</p>
                <p className="font-bold text-navy-900">{selectedInstallment.customers?.name}</p>
                <p className="text-lg font-black text-emerald-600 mt-2">{fmt(selectedInstallment.amount)} ج.م</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">تاريخ الدفع <span className="text-red-500">*</span></label>
                  <input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">طريقة الدفع <span className="text-red-500">*</span></label>
                  <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="form-input">
                    <option value="كاش">كاش</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="فودافون كاش">فودافون كاش</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">ملاحظات الدفع</label>
                <textarea rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="form-input" placeholder="رقم التحويل أو أي تفاصيل..." />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowPaymentModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSavePayment} disabled={saving} className="btn-gold flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                تأكيد السداد
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
