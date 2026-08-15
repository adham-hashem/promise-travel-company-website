import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ApprovalRequest } from '../types';

export default function ApprovalRequestsManager() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Only managers or admins can view and act on approvals
  const isManager = profile?.role === 'مدير' || profile?.role === 'Admin' || profile?.role === 'super_admin';

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
      } else if (req.type === 'cancel_installment' && req.record_type === 'financial_installments') {
        const { error: updErr } = await supabase.from('financial_installments').update({ status: 'ملغي' }).eq('id', req.record_id);
        if (updErr) throw updErr;
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
      
      alert('تم رفض الطلب.');
      loadRequests();
    } catch (err: any) {
      alert('حدث خطأ: ' + err.message);
    }
  };

  if (!isManager || (requests.length === 0 && !loading)) {
    return null; // Don't show anything if not manager or no pending requests
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden mb-6">
      <div className="bg-amber-50 p-4 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={20} />
          <h3 className="font-bold text-amber-900">طلبات بانتظار اعتماد الإدارة ({requests.length})</h3>
        </div>
        <button onClick={loadRequests} className="text-amber-700 text-xs font-medium hover:underline">
          تحديث الطلبات
        </button>
      </div>
      
      {loading ? (
        <div className="p-6 text-center text-gray-500">جاري تحميل الطلبات...</div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
          {requests.map(req => (
            <div key={req.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge bg-red-100 text-red-700 text-xs font-bold">
                    {req.type === 'delete_payment' ? 'حذف دفعة مالية' : 
                     req.type === 'cancel_installment' ? 'إلغاء قسط' : req.type}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(req.created_at || '').toLocaleString('ar-EG')}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-500">السبب:</span> {req.reason}
                </p>
                {req.record_details && (
                  <div className="mt-2 text-xs bg-gray-100 p-2 rounded text-gray-600 flex gap-4">
                    {req.record_details.amount && <span>المبلغ: {req.record_details.amount} ج.م</span>}
                    {req.record_details.customer_id && <span>العميل: {req.record_details.customers?.name || 'مرفق بالطلب'}</span>}
                  </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
