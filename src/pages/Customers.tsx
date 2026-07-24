import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Eye, Pencil, Phone, Hash, Globe, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
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

export default function Customers({ onNavigate, searchValue }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'الكل'>('الكل');
  const [transferCustomer, setTransferCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('customers')
        .select('*, packages(*), employees(*)')
        .order('created_at', { ascending: false });
      setCustomers((data as Customer[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = customers.filter((c) => {
    const matchSearch = !searchValue || c.name.includes(searchValue) || c.phone.includes(searchValue) || (c.client_code && c.client_code.includes(searchValue));
    const matchStatus = statusFilter === 'الكل' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
        <button
          onClick={() => onNavigate('customer-add')}
          className="btn-gold"
        >
          <Plus size={16} />
          إضافة عميل جديد
        </button>
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
                        <span className="badge bg-gray-100 text-gray-600">{c.source}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setTransferCustomer(c)}
                          className="btn-gold text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-xs whitespace-nowrap"
                          title="تحويل ملف العميل إلى قسم الحسابات"
                        >
                          <ArrowRightLeft size={13} />
                          تحويل للحسابات
                        </button>
                        <button
                          onClick={() => onNavigate('customer-details', c.id)}
                          className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={15} />
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
