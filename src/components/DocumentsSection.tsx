import { useEffect, useState, useRef } from 'react';
import {
  FileText, Upload, Download, Eye, CheckCircle2, XCircle, Clock,
  Loader2, Plus, X, FileCheck, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentRecord, DocType, DocStatus } from '../types';

interface Props {
  customerId?: string;
  bookingId?: string;
  customerName?: string;
}

const docTypes: { id: DocType; label: string; icon: typeof FileText }[] = [
  { id: 'جواز سفر', label: 'جواز السفر', icon: FileText },
  { id: 'بطاقة رقم قومي', label: 'البطاقة الشخصية', icon: FileText },
  { id: 'صورة شخصية', label: 'صورة شخصية', icon: FileText },
  { id: 'تأشيرة', label: 'تأشيرة', icon: FileText },
  { id: 'مستند إضافي', label: 'مستند إضافي', icon: FileText },
];

const statusConfig: Record<DocStatus, { label: string; class: string; icon: typeof Clock }> = {
  'مرفوع': { label: 'مرفوع', class: 'bg-blue-100 text-blue-700', icon: Upload },
  'قيد المراجعة': { label: 'قيد المراجعة', class: 'bg-amber-100 text-amber-700', icon: Clock },
  'مقبول': { label: 'مقبول', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'مرفوض': { label: 'مرفوض', class: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function DocumentsSection({ customerId, bookingId, customerName }: Props) {
  const { profile, can } = useAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<DocType>('جواز سفر');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = can('documents_upload');
  const canReview = can('documents_review');

  useEffect(() => {
    (async () => {
      let query = supabase.from('documents').select('*, customers(*), bookings(*), user_profiles(*)');
      if (customerId) query = query.eq('customer_id', customerId);
      else if (bookingId) query = query.eq('booking_id', bookingId);
      const { data } = await query.order('created_at', { ascending: false });
      setDocs((data as DocumentRecord[]) || []);
      setLoading(false);
    })();
  }, [customerId, bookingId]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${customerId || bookingId}/${Date.now()}_${uploadType}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setUploading(false); return; }

    // Generate doc sub-code if customer has a client_code
    let docNumber: string | null = null;
    if (customerId) {
      const { data: cust } = await supabase.from('customers').select('client_code').eq('id', customerId).maybeSingle();
      if (cust?.client_code) {
        const { data: code } = await supabase.rpc('generate_sub_code', { p_client_code: cust.client_code, p_prefix: 'DOC' });
        docNumber = code as string;
      }
    }

    const { data, error: insertErr } = await supabase.from('documents').insert({
      customer_id: customerId || null,
      booking_id: bookingId || null,
      uploaded_by: profile?.id || null,
      doc_type: uploadType,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      status: 'مرفوع',
      doc_number: docNumber,
    }).select('*, customers(*), bookings(*), user_profiles(*)').single();

    if (insertErr) { alert('فشل حفظ المستند: ' + insertErr.message); setUploading(false); return; }
    if (data) {
      setDocs([data as DocumentRecord, ...docs]);
      // Notify operations employees
      await notifyOperationsStaff(data as DocumentRecord);
    }
    setUploading(false);
    setShowUpload(false);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Send notification to all operations employees about new document
  const notifyOperationsStaff = async (doc: DocumentRecord) => {
    const { data: opsStaff } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'موظف التشغيل')
      .eq('status', 'نشط');
    if (!opsStaff || opsStaff.length === 0) return;
    const notifs = opsStaff.map((e: { id: string }) => ({
      employee_id: e.id,
      type: 'مستند جديد',
      title: `مستند جديد: ${doc.doc_type}`,
      body: `${doc.doc_type} جديد تم رفعه للعميل ${customerName || doc.customers?.name || ''}. يرجى المراجعة.`,
      is_read: false,
    }));
    await supabase.from('notifications').insert(notifs);
  };

  const updateStatus = async (doc: DocumentRecord, status: DocStatus, notes?: string) => {
    const { data } = await supabase.from('documents').update({
      status,
      review_notes: notes || null,
      reviewed_by: profile?.id || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', doc.id).select('*, customers(*), bookings(*), user_profiles(*)').single();
    if (data) setDocs(docs.map(d => d.id === doc.id ? (data as DocumentRecord) : d));
    setReviewingId(null);
    setReviewNotes('');
  };

  const downloadFile = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from('documents').download(doc.file_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name || 'document';
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewFile = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from('documents').download(doc.file_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    window.open(url, '_blank');
  };

  // Check which required doc types are missing
  const requiredTypes: DocType[] = ['جواز سفر', 'بطاقة رقم قومي', 'صورة شخصية'];
  const missingTypes = requiredTypes.filter(t => !docs.some(d => d.doc_type === t));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2">
          <FileCheck size={16} className="text-gold-500" />
          المستندات ({docs.length})
        </h4>
        {canUpload && (
          <button onClick={() => setShowUpload(!showUpload)} className="btn-gold text-xs py-2 px-3">
            <Plus size={14} /> رفع مستند
          </button>
        )}
      </div>

      {/* Missing documents alert */}
      {missingTypes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            مستندات مفقودة: <span className="font-bold">{missingTypes.join('، ')}</span>
          </p>
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-5 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold text-navy-800">رفع مستند جديد</h5>
            <button onClick={() => { setShowUpload(false); setFile(null); }} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400"><X size={16} /></button>
          </div>
          <div>
            <label className="form-label">نوع المستند</label>
            <select value={uploadType} onChange={(e) => setUploadType(e.target.value as DocType)} className="form-input">
              {docTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">الملف</label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="form-input" />
          </div>
          {file && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded-lg p-2">
              <FileText size={14} className="text-navy-600" />
              <span className="flex-1 truncate">{file.name}</span>
              <span>{(file.size / 1024).toFixed(0)} KB</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowUpload(false); setFile(null); }} className="btn-outline text-xs py-2 px-3">إلغاء</button>
            <button onClick={handleUpload} disabled={!file || uploading} className="btn-gold text-xs py-2 px-3">
              {uploading ? 'جارٍ الرفع...' : 'رفع المستند'}
            </button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={22} className="animate-spin text-navy-700" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا توجد مستندات مرفوعة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map(doc => {
            const Status = statusConfig[doc.status].icon;
            return (
              <div key={doc.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center text-navy-700">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-900">{doc.doc_type}</p>
                      <p className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                  <span className={`badge text-[10px] ${statusConfig[doc.status].class}`}>
                    <Status size={10} className="inline ml-1" />{statusConfig[doc.status].label}
                  </span>
                </div>
                {doc.file_name && <p className="text-xs text-gray-500 truncate mb-2">{doc.file_name}</p>}
                {doc.review_notes && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-2">{doc.review_notes}</p>
                )}
                <div className="flex items-center gap-1 pt-2 border-t border-gray-200">
                  <button onClick={() => viewFile(doc)} title="عرض" className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-600"><Eye size={14} /></button>
                  <button onClick={() => downloadFile(doc)} title="تحميل" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Download size={14} /></button>
                  {canReview && doc.status !== 'مقبول' && (
                    <>
                      <button onClick={() => updateStatus(doc, 'مقبول')} title="قبول" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle2 size={14} /></button>
                      <button onClick={() => setReviewingId(reviewingId === doc.id ? null : doc.id)} title="رفض/طلب تحديث" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><XCircle size={14} /></button>
                    </>
                  )}
                </div>
                {reviewingId === doc.id && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                    <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="سبب الرفض / المطلوب تحديثه" className="form-input text-xs min-h-[50px] resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(doc, 'مرفوض', reviewNotes)} className="btn-outline text-xs py-1 px-2 text-red-600 border-red-200">رفض</button>
                      <button onClick={() => updateStatus(doc, 'قيد المراجعة', reviewNotes)} className="btn-outline text-xs py-1 px-2 text-amber-600 border-amber-200">طلب تحديث</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
