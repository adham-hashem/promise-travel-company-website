import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Wallet, Clock, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Booking, Customer, Package } from '../types';
import { exportToExcel } from '../lib/export';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RevenueRow extends Booking {
  customers?: Customer;
  packages?: Package;
}

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

export default function Revenue() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');
  const [transferRow, setTransferRow] = useState<RevenueRow | null>(null);

  const openTransferModal = (r: RevenueRow) => setTransferRow(r);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, customers(*), packages(*)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[Revenue] Error:', error);
        alert(`خطأ في جلب بيانات الإيرادات: ${error.message}`);
      }

      setRows((data as RevenueRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === 'daily') start.setDate(now.getDate() - 1);
    else if (period === 'weekly') start.setDate(now.getDate() - 7);
    else if (period === 'monthly') start.setMonth(now.getMonth() - 1);
    else if (period === 'yearly') start.setFullYear(now.getFullYear() - 1);
    return rows.filter(r => new Date(r.created_at) >= start);
  }, [rows, period]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const paid = filtered.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
    return { total, paid, remaining: total - paid };
  }, [filtered]);

  const handleExport = () => {
    const data = filtered.map((r, i) => ({
      '#': i + 1,
      'العميل': r.customers?.name || '—',
      'الخدمة': r.packages?.type || '—',
      'رقم الحجز': r.id.slice(0, 8),
      'الإجمالي': Number(r.total_amount || 0),
      'المدفوع': Number(r.paid_amount || 0),
      'المتبقي': Number(r.total_amount || 0) - Number(r.paid_amount || 0),
      'التاريخ': new Date(r.created_at).toLocaleDateString('ar-EG'),
    }));
    exportToExcel(data, `الإيرادات_${period}`);
  };

  const periods: { id: Period; label: string }[] = [
    { id: 'daily', label: 'يومي' },
    { id: 'weekly', label: 'أسبوعي' },
    { id: 'monthly', label: 'شهري' },
    { id: 'yearly', label: 'سنوي' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">الإيرادات</h2>
          <p className="section-subtitle">إجمالي إيرادات الشركة من الحج والعمرة والرحلات الداخلية</p>
        </div>
        <button onClick={handleExport} className="btn-outline"><Download size={16} /> تصدير Excel</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
              <p className="text-2xl font-black text-navy-900 mt-1">{fmt(totals.total)} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700"><TrendingUp size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">المبلغ المدفوع</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(totals.paid)} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Wallet size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">المبلغ المتبقي</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{fmt(totals.remaining)} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={22} /></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${period === p.id ? 'bg-navy-800 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-navy-300'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>رقم العملية</th>
                <th>اسم العميل</th>
                <th>نوع الخدمة</th>
                <th>رقم الحجز</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>تاريخ الدفع</th>
                <th>الدفعة / الحالة</th>
                <th>إجراءات التحويل</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">لا توجد إيرادات في هذه الفترة</td></tr>
              ) : filtered.map((r) => {
                const remaining = Number(r.total_amount || 0) - Number(r.paid_amount || 0);
                return (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-gray-500">#{r.id.slice(0, 8)}</td>
                    <td className="font-semibold text-gray-800">{r.customers?.name || '—'}</td>
                    <td><span className="badge bg-navy-50 text-navy-700">{r.packages?.type || '—'}</span></td>
                    <td className="font-mono text-xs text-gray-500">{r.id.slice(0, 8)}</td>
                    <td className="font-bold text-navy-900">{fmt(Number(r.total_amount || 0))}</td>
                    <td className="text-emerald-600 font-semibold">{fmt(Number(r.paid_amount || 0))}</td>
                    <td className="text-amber-600 font-semibold">{fmt(remaining)}</td>
                    <td className="text-gray-500 text-sm">{new Date(r.booking_date).toLocaleDateString('ar-EG')}</td>
                    <td className="text-gray-500 text-sm">{r.payment_status || '—'}</td>
                    <td>
                      <button
                        onClick={() => openTransferModal(r)}
                        className="btn-gold text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        تحويل للتشغيل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transfer to Operations Modal */}
      {transferRow && (
        <TransferToOpsModal
          row={transferRow}
          onClose={() => setTransferRow(null)}
          onTransferred={() => { setTransferRow(null); }}
        />
      )}
    </div>
  );
}

interface TransferOpsProps {
  row: RevenueRow;
  onClose: () => void;
  onTransferred: () => void;
}

function TransferToOpsModal({ row, onClose, onTransferred }: TransferOpsProps) {
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
    setTransferring(true);
    const { data: existingOp } = await supabase
      .from('operation_files')
      .select('id')
      .eq('booking_id', row.id)
      .maybeSingle();

    const payload = {
      customer_id: row.customer_id,
      booking_id: row.id,
      workflow_stage: 'operations',
      file_status: 'قيد التجهيز',
      financially_approved: true,
      assigned_to: targetEmpId || null,
      notes: notes ? `تم التحويل من قسم الحسابات: ${notes}` : 'تم التحويل من قسم الحسابات واكتمال الاعتماد المالي',
    };

    if (existingOp) {
      await supabase.from('operation_files').update(payload).eq('id', existingOp.id);
    } else {
      await supabase.from('operation_files').insert(payload);
    }

    if (row.customer_id) {
      await supabase.from('workflow_timeline').insert({
        customer_id: row.customer_id,
        booking_id: row.id,
        stage: 'operations',
        stage_label: 'قسم التشغيل',
        department: 'الحسابات',
        employee_id: targetEmpId || null,
        status: 'مكتمل',
        notes: notes || 'تم تحويل الملف من قسم الحسابات إلى قسم التشغيل مع الاعتماد المالي',
      });
    }

    if (targetEmpId) {
      await supabase.from('notifications').insert({
        employee_id: targetEmpId,
        type: 'task_assigned',
        title: 'ملف تشغيل جديد محول من قسم الحسابات',
        body: `العميل: ${row.customers?.name || '—'} - ملاحظات الحسابات: ${notes}`,
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
            <h3 className="font-bold text-navy-900 text-base">تحويل الحجز إلى قسم التشغيل</h3>
            <p className="text-xs text-gray-500">العميل: <span className="font-semibold text-navy-900">{row.customers?.name || '—'}</span></p>
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
              placeholder="تفاصيل الدفعات، الاعتماد المالي، ملاحظات الفندق أو البرنامج..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTransfer}
            disabled={transferring}
            className="btn-gold flex-1 justify-center text-xs py-2.5"
          >
            {transferring ? 'جارٍ التحويل...' : 'تأكيد التحويل لقسم التشغيل'}
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
