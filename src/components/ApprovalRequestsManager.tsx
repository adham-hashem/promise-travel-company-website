import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, FileText, AlertTriangle, User, Wallet, CalendarClock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ApprovalRequest } from '../types';

interface Props {
  showEmptyState?: boolean;
}

const requestTypeLabels: Record<string, string> = {
  delete_payment: 'حذف عملية مالية',
  refund_payment: 'إرجاع دفعة مالية',
  cancel_installment: 'إلغاء قسط',
  cancel_customer_trip: 'إلغاء رحلة عميل',
  cancel_booking: 'إلغاء حجز',
};

const getCustomerName = (req: ApprovalRequest) => (
  req.record_details?.customers?.name
  || req.record_details?.customer?.name
  || req.record_details?.customer_name
  || req.record_details?.name
  || 'غير محدد'
);

const getAmount = (req: ApprovalRequest) => Number(req.amount || req.record_details?.amount || req.record_details?.total_amount || 0);

export default function ApprovalRequestsManager({ showEmptyState = false }: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Only managers or admins can view and act on approvals
  const isManager = profile?.role === 'super_admin' || profile?.role === 'مالك النظام' || profile?.role === 'مدير النظام' || profile?.role === 'مدير المبيعات';

  useEffect(() => {
    if (isManager) {
      loadRequests();
    } else {
      setLoading(false);
    }
  }, [isManager]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('approval_requests')
      .select('*, requester:user_profiles!approval_requests_requested_by_fkey(*), reviewer:user_profiles!approval_requests_reviewed_by_fkey(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) {
      setRequests(data as ApprovalRequest[]);
    }
    setLoading(false);
  };

  const handleApprove = async (req: ApprovalRequest) => {
    if (!confirm('هل أنت متأكد من الموافقة على هذا الطلب وإتمام العملية؟')) return;

    try {
      // Execute the requested action based on type
      if (req.type === 'delete_payment' && req.record_type === 'payments') {
        const { error: delErr } = await supabase.from('payments').delete().eq('id', req.record_id);
        if (delErr) throw delErr;
      } else if (req.type === 'refund_payment' && req.record_type === 'payments') {
        const { error: updErr } = await supabase
          .from('payments')
          .update({
            status: 'غير مدفوع',
            approval_status: 'مرفوض',
            rejection_reason: req.reason,
            notes: `${req.record_details?.notes || ''}\nتم اعتماد إرجاع الدفعة بواسطة الإدارة: ${req.reason}`.trim(),
          })
          .eq('id', req.record_id);
        if (updErr) throw updErr;
      } else if (req.type === 'cancel_installment' && req.record_type === 'financial_installments') {
        const { error: updErr } = await supabase.from('financial_installments').update({ status: 'ملغي' }).eq('id', req.record_id);
        if (updErr) throw updErr;
      } else if (req.type === 'cancel_booking' && req.record_type === 'bookings') {
        const { error: updErr } = await supabase.from('bookings').update({ status: 'ملغي' }).eq('id', req.record_id);
        if (updErr) throw updErr;
      } else if (req.type === 'cancel_customer_trip') {
        if (req.record_type === 'bookings') {
          const { error: updErr } = await supabase.from('bookings').update({ status: 'ملغي' }).eq('id', req.record_id);
          if (updErr) throw updErr;
        }
        const customerId = req.customer_id || req.record_details?.customer_id;
        if (customerId) {
          const { error: custErr } = await supabase.from('customers').update({ status: 'ملغي' }).eq('id', customerId);
          if (custErr) throw custErr;
        }
      }

      // Mark request as approved
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'approved',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', req.id);
        
      if (error) throw error;
      await supabase
        .from('notifications')
        .update({ requires_action: false, resolved_at: new Date().toISOString(), is_read: true })
        .eq('type', 'approval_request')
        .eq('target_record_id', req.id);
      
      alert('تم الاعتماد بنجاح وتحديث النظام.');
      loadRequests();
    } catch (err: any) {
      alert('حدث خطأ: ' + err.message);
    }
  };

  const handleReject = async (req: ApprovalRequest) => {
    const reason = prompt('يرجى إدخال سبب الرفض:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          notes: reason
        })
        .eq('id', req.id);
        
      if (error) throw error;
      await supabase
        .from('notifications')
        .update({ requires_action: false, resolved_at: new Date().toISOString(), is_read: true })
        .eq('type', 'approval_request')
        .eq('target_record_id', req.id);
      
      alert('تم رفض الطلب.');
      loadRequests();
    } catch (err: any) {
      alert('حدث خطأ: ' + err.message);
    }
  };

  if (!isManager || (requests.length === 0 && !loading)) {
    if (showEmptyState && isManager && !loading) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-500">
          <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
          <p className="font-bold text-navy-900">لا توجد طلبات موافقة معلقة</p>
          <p className="text-sm mt-1">أي عملية حساسة جديدة ستظهر هنا فور إنشائها.</p>
        </div>
      );
    }
    return null; // Don't show anything if not manager or no pending requests
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden mb-6">
      <div className="bg-amber-50 p-4 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={20} />
          <h3 className="font-bold text-amber-900">طلبات الموافقة ({requests.length})</h3>
        </div>
        <button onClick={loadRequests} className="text-amber-700 text-xs font-medium hover:underline">
          تحديث الطلبات
        </button>
      </div>
      
      {loading ? (
        <div className="p-6 text-center text-gray-500">جاري تحميل الطلبات...</div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
          {requests.map(req => {
            const amount = getAmount(req);
            return (
            <div key={req.id} className="p-4 hover:bg-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge bg-red-100 text-red-700 text-xs font-bold">
                    {requestTypeLabels[req.type] || req.type}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(req.created_at || '').toLocaleString('ar-EG')}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-xs">
                  <div className="bg-white border border-gray-100 rounded-lg p-2 flex items-center gap-2">
                    <User size={14} className="text-navy-600" />
                    <span className="text-gray-500">الموظف:</span>
                    <span className="font-bold text-gray-800 truncate">{req.requester?.name || 'غير محدد'}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-2 flex items-center gap-2">
                    <FileText size={14} className="text-gold-600" />
                    <span className="text-gray-500">العميل:</span>
                    <span className="font-bold text-gray-800 truncate">{getCustomerName(req)}</span>
                  </div>
                  {amount > 0 && (
                    <div className="bg-white border border-gray-100 rounded-lg p-2 flex items-center gap-2">
                      <Wallet size={14} className="text-emerald-600" />
                      <span className="text-gray-500">المبلغ:</span>
                      <span className="font-bold text-gray-800">{amount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  )}
                  <div className="bg-white border border-gray-100 rounded-lg p-2 flex items-center gap-2">
                    <CalendarClock size={14} className="text-gray-500" />
                    <span className="text-gray-500">التاريخ:</span>
                    <span className="font-bold text-gray-800">{new Date(req.created_at || '').toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-800 mt-3">
                  <span className="text-gray-500">السبب:</span> {req.reason}
                </p>
                {req.record_details && (
                  <p className="mt-2 text-xs bg-gray-100 p-2 rounded-lg text-gray-600 leading-relaxed">
                    {req.record_details.package_name || req.record_details.packages?.name || req.record_details.notes || 'تفاصيل العملية محفوظة مع الطلب.'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleApprove(req)}
                  className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                >
                  <CheckCircle2 size={14} /> اعتماد
                </button>
                <button 
                  onClick={() => handleReject(req)}
                  className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <XCircle size={14} /> رفض
                </button>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
