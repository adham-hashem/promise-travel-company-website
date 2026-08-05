import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Eye, Phone, Hash, Globe, ArrowRightLeft, Trash2, Undo2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import type { Customer, CustomerStatus, Page } from '../types';

const statusColors: Record<CustomerStatus, string> = {
  جديد: 'bg-blue-100 text-blue-700 border border-blue-200',
  مهتم: 'bg-amber-100 text-amber-700 border border-amber-200',
  متابعة: 'bg-purple-100 text-purple-700 border border-purple-200',
  حجز: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  مغلق: 'bg-gray-200 text-gray-600 border border-gray-300',
  'تم الحجز': 'bg-green-100 text-green-700 border border-green-200',
  مكتمل: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  ملغي: 'bg-red-100 text-red-700 border border-red-200',
};

const allStatuses: CustomerStatus[] = ['جديد', 'مهتم', 'متابعة', 'تم الحجز', 'مكتمل', 'ملغي'];

interface Props {
  onNavigate: (page: Page, id?: string) => void;
  searchValue: string;
}

interface CustomerWithOpFile extends Customer {
  operation_files?: Array<{ id: string; workflow_stage: string }>;
}

export default function Customers({ onNavigate, searchValue }: Props) {
  const [customers, setCustomers] = useState<CustomerWithOpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'الكل'>('الكل');
  const [transferCustomer, setTransferCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      let { data } = await supabase
        .from('customers')
        .select('*, packages(*), employees(*), operation_files(id, workflow_stage)')
        .eq('is_vip', false)
        .order('created_at', { ascending: false });
        
      if (data) {
        data = data.filter(c => !c.source || !c.source.startsWith('مسودة:'));
      }
      setCustomers((data as CustomerWithOpFile[]) || []);
      setLoading(false);
    }
    load();
  }, []);
  const handleExportExcel = () => {
    const data = filtered.map(c => ({
      'الكود': c.client_code || '—',
      'الاسم': c.name,
      'الهاتف': c.phone,
      'المحافظة': c.governorate || '—',
      'الحالة': c.status,
      'الموظف المسؤول': c.employees?.name || '—',
      'تاريخ الإضافة': new Date(c.created_at).toLocaleDateString('ar-EG'),
      'المصدر': c.source || '—'
    }));
    exportToExcel(data, 'العملاء_CRM');
  };

  const handleExportPDF = () => {
    const headers = ['الكود', 'الاسم', 'الهاتف', 'المحافظة', 'الحالة', 'الموظف المسؤول', 'تاريخ الإضافة', 'المصدر'];
    const rows = filtered.map(c => [
      c.client_code || '—',
      c.name,
      c.phone,
      c.governorate || '—',
      c.status,
      c.employees?.name || '—',
      new Date(c.created_at).toLocaleDateString('ar-EG'),
      c.source || '—'
    ]);
    exportToPDF('تقرير عملاء CRM', headers, rows);
  };


  const filtered = customers.filter((c) => {
    if (c.is_archived && !searchValue) return false;
    const matchSearch = !searchValue || c.name.includes(searchValue) || c.phone.includes(searchValue) || (c.client_code && c.client_code.includes(searchValue));
    const matchStatus = statusFilter === 'الكل' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const [{ data: hasFlight }, { data: hasOp }, { data: hasPayment }] = await Promise.all([
      supabase.from('flight_tickets').select('id').eq('customer_id', deleteTarget.id).limit(1),
      supabase.from('operation_files').select('id').eq('customer_id', deleteTarget.id).limit(1),
      supabase.from('payments').select('id').eq('customer_id', deleteTarget.id).limit(1)
    ]);

    if (hasFlight && hasFlight.length > 0) {
      alert("لا يمكن حذف العميل من هذه المرحلة لأنه لا يزال موجوداً في قسم الطيران. يجب حذفه من المراحل التالية أولاً.");
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }

    if (hasOp && hasOp.length > 0) {
      alert("لا يمكن حذف العميل من هذه المرحلة لأنه لا يزال موجوداً في قسم التشغيل. يجب حذفه من المراحل التالية أولاً.");
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }

    if (hasPayment && hasPayment.length > 0) {
      alert("لا يمكن حذف العميل من هذه المرحلة لأنه لا يزال موجوداً في الحسابات - المدفوعات. يجب حذفه من المراحل التالية أولاً.");
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }

    await supabase.from('customers').delete().eq('id', deleteTarget.id);
    
    // Auto revert inquiry conversion if it exists
    await supabase.from('inquiries').update({ converted_customer_id: null, status: 'جديد' }).eq('converted_customer_id', deleteTarget.id);

    setCustomers(customers.filter(c => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
    alert('تم حذف العميل من المرحلة الحالية بنجاح.');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('الكل')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'الكل' ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-navy-300'}`}
          >
            الكل
          </button>
          {allStatuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-navy-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
            <Download size={14} /> PDF
          </button>
          <button
            onClick={() => onNavigate('customer-add')}
            className="btn-gold animate-fadeIn"
          >
            <Plus size={16} />
            إضافة عميل جديد
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-600">
            إجمالي النتائج: <span className="text-navy-800 font-bold">{filtered.length}</span> عميل
          </p>
          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={15} />
            <span className="text-xs">فلترة متقدمة</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم العميل</th>
                  <th>رقم الهاتف</th>
                  <th>المحافظة</th>
                  <th>الحالة</th>
                  <th>الموظف المسؤول</th>
                  <th>تاريخ الإضافة</th>
                  <th>آخر متابعة</th>
                  <th>المصدر</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-navy-50/30 transition-colors">
                    <td>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-navy-50 text-navy-700 rounded-lg text-xs font-mono font-semibold border border-navy-100">
                        <Hash size={10} />{c.client_code || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-navy flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-800">{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone size={13} className="text-gray-400" />
                        <span dir="ltr">{c.phone}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">{c.governorate || '—'}</td>
                    <td>
                      <span className={`badge ${statusColors[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="text-gray-600">{c.employees?.name || '—'}</td>
                    <td className="text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                    <td className="text-gray-500 text-xs">
                      {c.last_follow_up ? new Date(c.last_follow_up).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td>
                      {c.source === 'Website' ? (
                        <span className="badge bg-gold-100 text-gold-700 flex items-center gap-1 w-fit">
                          <Globe size={10} /> Website
                        </span>
                      ) : c.source ? (
                        <span className="badge bg-gray-100 text-gray-600">{c.source.replace(/^مندوب:\s*/, '')}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {c.operation_files && c.operation_files.length > 0 ? (
                          <>
                            <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-semibold whitespace-nowrap">
                              محوّل ✔
                            </span>
                          </>
                        ) : (
                          <button
                            onClick={() => setTransferCustomer(c)}
                            className="btn-gold text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-xs whitespace-nowrap"
                            title="تحويل ملف العميل إلى قسم الحسابات"
                          >
                            <ArrowRightLeft size={13} />
                            تحويل للحسابات
                          </button>
                        )}
                        <button
                          onClick={() => onNavigate('customer-details', c.id)}
                          className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="حذف العميل"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">لا توجد نتائج</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer to Accounts Modal */}
      {transferCustomer && (
        <TransferAccountsModal
          customer={transferCustomer}
          onClose={() => setTransferCustomer(null)}
          onTransferred={() => setTransferCustomer(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-base">حذف العميل نهائياً</h3>
                <p className="text-xs text-red-600">هذا الإجراء لا يمكن التراجع عنه!</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              هل أنت متأكد من حذف العميل <span className="font-bold text-navy-900">{deleteTarget.name}</span>?
              <br /><span className="text-xs text-red-500 block mt-1">سيتم حذف جميع بياناته وسجلاته ومستنداته بشكل نهائي.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2"
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'جارٍ الحذف...' : 'حذف نهائي'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
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

interface TransferAccountsProps {
  customer: Customer;
  onClose: () => void;
  onTransferred: () => void;
}

function TransferAccountsModal({ customer, onClose, onTransferred }: TransferAccountsProps) {
  const [accountsEmployees, setAccountsEmployees] = useState<{ id: string; name: string }[]>([]);
  const [targetEmpId, setTargetEmpId] = useState('');
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('employees').select('id, name, role').eq('is_active', true);
      const accList = (data || []).filter((e: any) => e.role === 'محاسب' || e.role === 'مالك النظام' || e.role === 'مدير النظام' || e.role === 'super_admin');
      setAccountsEmployees(accList.map((e: any) => ({ id: e.id, name: `${e.name} (${e.role})` })));
    })();
  }, []);

  const handleTransfer = async () => {
    setTransferring(true);
    const { data: existingOp } = await supabase.from('operation_files').select('id').eq('customer_id', customer.id).maybeSingle();
    const payload = {
      customer_id: customer.id,
      workflow_stage: 'accounts',
      file_status: 'جديد',
      assigned_to: targetEmpId || null,
      notes: notes ? `تم التحويل من قائمة العملاء CRM: ${notes}` : 'تم التحويل من العملاء CRM إلى قسم الحسابات',
    };

    if (existingOp) {
      await supabase.from('operation_files').update(payload).eq('id', existingOp.id);
    } else {
      await supabase.from('operation_files').insert(payload);
    }

    await supabase.from('workflow_timeline').insert({
      customer_id: customer.id,
      stage: 'accounts',
      stage_label: 'قسم الحسابات',
      department: 'CRM / العملاء',
      employee_id: targetEmpId || null,
      status: 'مكتمل',
      notes: notes || 'تم تحويل العميل من قائمة العملاء CRM إلى قسم الحسابات',
    });

    if (targetEmpId) {
      await supabase.from('notifications').insert({
        employee_id: targetEmpId,
        type: 'new_customer',
        title: 'عميل جديد محول من قائمة العملاء CRM إلى الحسابات',
        body: `العميل: ${customer.name} - ملاحظات: ${notes}`,
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
            2➜3
          </div>
          <div>
            <h3 className="font-bold text-navy-900 text-base">تحويل العميل إلى قسم الحسابات</h3>
            <p className="text-xs text-gray-500">العميل: <span className="font-semibold text-navy-900">{customer.name}</span></p>
          </div>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <label className="form-label font-bold text-navy-900 text-xs">اختر موظف قسم الحسابات المستلم:</label>
            <select
              value={targetEmpId}
              onChange={(e) => setTargetEmpId(e.target.value)}
              className="form-input text-xs"
            >
              <option value="">— جميع فريق الحسابات —</option>
              {accountsEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label font-bold text-navy-900 text-xs">ملاحظات وتعليمات التحويل للحسابات:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input text-xs resize-none"
              rows={3}
              placeholder="اكتب تفاصيل الفواتير، الدفعات، طريقة السداد المطلوبة..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTransfer}
            disabled={transferring}
            className="btn-gold flex-1 justify-center text-xs py-2.5"
          >
            {transferring ? 'جارٍ التحويل...' : 'تأكيد وإرسال لقسم الحسابات'}
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
