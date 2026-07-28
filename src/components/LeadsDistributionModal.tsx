import { useState, useEffect } from 'react';
import { X, Upload, Users, Shuffle, Hand, FileSpreadsheet, Check, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Employee } from '../types';
import * as XLSX from 'xlsx';

type DistributionMode = 'auto' | 'manual';
type InputMode = 'file' | 'manual';

interface Props {
  employees: Employee[];
  onClose: () => void;
  onDistributed: () => void;
}

interface ParsedLead {
  name: string;
  phone: string;
  governorate?: string;
}

export default function LeadsDistributionModal({ employees, onClose, onDistributed }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [manualText, setManualText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileLeads, setFileLeads] = useState<ParsedLead[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [mode, setMode] = useState<DistributionMode>('auto');
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({});
  const [distributing, setDistributing] = useState(false);
  const [result, setResult] = useState<{ count: number; perEmployee: Record<string, number> } | null>(null);
  const [error, setError] = useState('');

  const salesEmployees = employees.filter((e) => e.is_active);

  useEffect(() => {
    const ids = salesEmployees.map((e) => e.id);
    setSelectedEmployeeIds(ids);
  }, [employees]);

  const parseManualText = (): ParsedLead[] => {
    return manualText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Accept formats: "name,phone" or "phone" or "name|phone|governorate"
        const parts = line.split(/[,\t|]/).map((p) => p.trim());
        if (parts.length === 1) return { name: `عميل ${parts[0].slice(-4)}`, phone: parts[0] };
        if (parts.length === 2) return { name: parts[0], phone: parts[1] };
        return { name: parts[0], phone: parts[1], governorate: parts[2] };
      })
      .filter((lead) => lead.phone);
  };

  const parsedLeads: ParsedLead[] = inputMode === 'file' ? fileLeads : parseManualText();

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array of arrays
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length === 0) {
          setError('الملف فارغ أو لا يحتوي على صفوف بيانات');
          return;
        }

        // Find headers or assume order
        const firstRow = (rows[0] || []).map(cell => String(cell || '').trim().toLowerCase());
        
        // Search for column indices by keywords
        let nameIdx = firstRow.findIndex(h => h.includes('الاسم') || h.includes('الاسم الكامل') || h.includes('name') || h.includes('العميل'));
        let phoneIdx = firstRow.findIndex(h => h.includes('الهاتف') || h.includes('تليفون') || h.includes('phone') || h.includes('mobile') || h.includes('جوال') || h.includes('رقم'));
        let govIdx = firstRow.findIndex(h => h.includes('المحافظة') || h.includes('governorate') || h.includes('المدينة') || h.includes('city') || h.includes('محافظه'));

        // Fallbacks to default column positions if headers aren't detected
        if (nameIdx === -1) nameIdx = 0;
        if (phoneIdx === -1) phoneIdx = 1;
        if (govIdx === -1) govIdx = 2;

        // Skip header if it is not numeric and contains text labels
        const startRow = (/\d/.test(firstRow[phoneIdx] || '') && !firstRow[phoneIdx].includes('الهاتف') && !firstRow[phoneIdx].includes('phone')) ? 0 : 1;
        
        const leads: ParsedLead[] = [];
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawPhone = String(row[phoneIdx] !== undefined ? row[phoneIdx] : '').trim();
          // Clean phone from decimals like .0 if imported as numeric
          const phone = rawPhone.replace(/\.0$/, '');

          if (!phone) continue;

          const name = String(row[nameIdx] !== undefined ? row[nameIdx] : '').trim() || `عميل ${phone.slice(-4)}`;
          const governorate = row[govIdx] !== undefined ? String(row[govIdx]).trim() : undefined;

          leads.push({ name, phone, governorate });
        }

        if (leads.length === 0) {
          setError('لم يتم العثور على أرقام هواتف صالحة في الملف. يرجى التأكد من التنسيق.');
        } else {
          setFileLeads(leads);
        }
      } catch (err) {
        setError('حدث خطأ أثناء قراءة ملف Excel: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const distribute = async () => {
    setError('');
    if (parsedLeads.length === 0) {
      setError('لا يوجد عملاء للتوزيع. أدخل أرقام العملاء أو ارفع ملف.');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setError('اختر موظفاً واحداً على الأقل للتوزيع');
      return;
    }
    setDistributing(true);

    try {
      // Fetch existing phone numbers to avoid duplicates
      const phones = parsedLeads.map((l) => l.phone);
      const { data: existing } = await supabase
        .from('customers')
        .select('phone')
        .in('phone', phones);
      const existingSet = new Set((existing || []).map((r: { phone: string }) => r.phone));

      const leadsToInsert = parsedLeads.filter((l) => !existingSet.has(l.phone));

      if (leadsToInsert.length === 0) {
        setError('جميع الأرقام موجودة مسبقاً في قاعدة البيانات');
        setDistributing(false);
        return;
      }

      // Build insert rows
      const rows: { name: string; phone: string; governorate: string | null; assigned_employee_id: string; status: string }[] = [];

      if (mode === 'auto') {
        // Round-robin assign
        leadsToInsert.forEach((lead, idx) => {
          const empId = selectedEmployeeIds[idx % selectedEmployeeIds.length];
          rows.push({
            name: lead.name,
            phone: lead.phone,
            governorate: lead.governorate || null,
            assigned_employee_id: empId,
            status: 'جديد',
          });
        });
      } else {
        // Manual assignments
        leadsToInsert.forEach((lead, idx) => {
          const empId = manualAssignments[lead.phone || idx.toString()];
          if (!empId) return;
          rows.push({
            name: lead.name,
            phone: lead.phone,
            governorate: lead.governorate || null,
            assigned_employee_id: empId,
            status: 'جديد',
          });
        });

        const noEmp = leadsToInsert.filter((_, idx) => !manualAssignments[_.phone || idx.toString()]);
        if (noEmp.length > 0) {
          setError(`بقي ${noEmp.length} عميل بدون موظف محدد. اضغط على اسم موظف لكل عميل.`);
          setDistributing(false);
          return;
        }
      }

      const { data: insertedCustomers, error: insertError } = await supabase
        .from('customers')
        .insert(rows)
        .select('id, name, client_code, assigned_employee_id');

      if (insertError) {
        setError(insertError.message);
        setDistributing(false);
        return;
      }

      // Automatically add follow-up tasks for these employees
      if (insertedCustomers && insertedCustomers.length > 0) {
        const taskRows = insertedCustomers.map((cust: any) => ({
          title: `متابعة العميل الجديد: ${cust.name}`,
          description: `تم توزيع هذا العميل عليك تلقائياً للمتابعة والتواصل.`,
          employee_id: cust.assigned_employee_id,
          priority: 'متوسطة',
          status: 'جديدة',
          start_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
          client_code: cust.client_code,
        }));
        await supabase.from('tasks').insert(taskRows);
      }

      // Insert notifications: new_lead for each assigned employee
      const notifs = Array.from(new Set(rows.map((r) => r.assigned_employee_id))).map((empId) => ({
        employee_id: empId,
        type: 'new_lead' as const,
        title: 'وصول عملاء جدد',
        body: `تم توزيع ${rows.filter((r) => r.assigned_employee_id === empId).length} عميل جديد عليك وتعيين مهام لمتابعتهم`,
      }));
      if (notifs.length > 0) {
        await supabase.from('notifications').insert(notifs);
      }

      const perEmployee: Record<string, number> = {};
      rows.forEach((r) => {
        perEmployee[r.assigned_employee_id] = (perEmployee[r.assigned_employee_id] || 0) + 1;
      });

      setResult({ count: rows.length, perEmployee });
    } catch (err) {
      setError((err as Error).message);
    }
    setDistributing(false);
  };

  const empName = (id: string) => salesEmployees.find((e) => e.id === id)?.name || id;

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">تم توزيع العملاء بنجاح</h3>
            <p className="text-gray-500 text-sm mb-5">تم توزيع {result.count} عميل على {Object.keys(result.perEmployee).length} موظف</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-5">
              {Object.entries(result.perEmployee).map(([id, count]) => (
                <div key={id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{empName(id)}</span>
                  <span className="text-navy-800 font-bold">{count} عميل</span>
                </div>
              ))}
            </div>
            <button onClick={() => { onDistributed(); onClose(); }} className="btn-gold w-full justify-center">
              تم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-navy-900">توزيع العملاء على الموظفين</h3>
            <p className="text-xs text-gray-500 mt-0.5">إضافة دفعة عملاء وتوزيعها تلقائياً أو يدوياً</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1 min-h-0">
          {/* Input mode toggle */}
          <div>
            <h4 className="text-xs font-bold text-navy-700 mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-gold-500 rounded-full" />إدخال العملاء
            </h4>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setInputMode('manual')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${inputMode === 'manual' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Users size={15} />إدخال يدوي
              </button>
              <button onClick={() => setInputMode('file')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${inputMode === 'file' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <FileSpreadsheet size={15} />رفع ملف Excel / CSV
              </button>
            </div>

            {inputMode === 'manual' ? (
              <div>
                <textarea
                  value={manualText} onChange={(e) => setManualText(e.target.value)}
                  placeholder={'أدخل كل عميل في سطر منفصل. الصيغ المدعومة:\nالاسم,الهاتف\nالهاتف فقط\nالاسم,الهاتف,المحافظة'}
                  rows={6}
                  className="form-input font-mono text-xs"
                  dir="rtl"
                />
                {manualText.trim() && (
                  <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                    تم تحديد {parseManualText().length} عميل
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-navy-400 hover:bg-gray-50 transition-all">
                  <Upload size={28} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600 mb-1">
                    {fileName || 'اضغط لرفع ملف Excel أو CSV'}
                  </p>
                  <p className="text-[10px] text-gray-400">الصيغ المدعومة: .xlsx, .xls, .csv, .txt</p>
                  <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileUpload} className="hidden" />
                </label>

                {/* Excel guide widget */}
                <div className="bg-navy-50/70 border border-navy-100 rounded-xl p-4 text-xs text-navy-800 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-navy-900">
                    <Info size={14} className="text-gold-500" />
                    تنسيق ملف الـ Excel الصحيح للاستيراد:
                  </p>
                  <p className="text-[11px] text-gray-600">
                    يجب أن يحتوي الملف على عمود للهاتف (إجباري)، بينما بقية الأعمدة اختيارية:
                  </p>
                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-gray-100 text-center font-mono">
                    <div className="p-1.5 bg-gray-50 rounded">
                      <span className="block font-bold text-[10px] text-gray-400">العمود 1</span>
                      <span className="text-[11px] text-navy-900 font-bold">الاسم</span>
                    </div>
                    <div className="p-1.5 bg-navy-100/50 rounded border border-navy-200">
                      <span className="block font-bold text-[10px] text-blue-600">العمود 2 *</span>
                      <span className="text-[11px] text-blue-900 font-bold">الهاتف</span>
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded">
                      <span className="block font-bold text-[10px] text-gray-400">العمود 3</span>
                      <span className="text-[11px] text-navy-900 font-bold">المحافظة</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    ملاحظة: يتعرف النظام تلقائياً على الأعمدة إذا كانت تحتوي على العناوين (الاسم، الهاتف، المحافظة).
                  </p>
                </div>

                {fileLeads.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-1.5 font-medium">تم تحديد {fileLeads.length} عميل من الملف</p>
                )}
              </div>
            )}
          </div>

          {/* Target employees */}
          <div>
            <h4 className="text-xs font-bold text-navy-700 mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-gold-500 rounded-full" />الموظفون المستهدفون
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {salesEmployees.map((e) => (
                <label key={e.id} className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedEmployeeIds.includes(e.id) ? 'border-navy-700 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div onClick={() => toggleEmployee(e.id)} className={`w-4 h-4 rounded flex items-center justify-center border-2 ${selectedEmployeeIds.includes(e.id) ? 'bg-navy-700 border-navy-700' : 'border-gray-300'}`}>
                    {selectedEmployeeIds.includes(e.id) && <Check size={10} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{e.name}</p>
                    <p className="text-[10px] text-gray-400">{e.clients_count} عميل حالي</p>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={() => setSelectedEmployeeIds(salesEmployees.map((e) => e.id))} className="text-xs text-navy-700 font-semibold mt-2 hover:underline">
              تحديد الكل
            </button>
          </div>

          {/* Distribution mode */}
          <div>
            <h4 className="text-xs font-bold text-navy-700 mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-gold-500 rounded-full" />نوع التوزيع
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('auto')} className={`p-4 rounded-xl border-2 text-right transition-all ${mode === 'auto' ? 'border-navy-700 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <Shuffle size={18} className="text-navy-600 mb-1.5" />
                <p className="font-bold text-sm text-navy-800 mb-0.5">تلقائي بالتساوي</p>
                <p className="text-[10px] text-gray-400">كل موظف يأخذ عدداً متساوياً</p>
              </button>
              <button onClick={() => setMode('manual')} className={`p-4 rounded-xl border-2 text-right transition-all ${mode === 'manual' ? 'border-navy-700 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <Hand size={18} className="text-navy-600 mb-1.5" />
                <p className="font-bold text-sm text-navy-800 mb-0.5">توزيع يدوي</p>
                <p className="text-[10px] text-gray-400">حدد موظف كل عميل يدوياً</p>
              </button>
            </div>
          </div>

          {/* Manual assignment UI */}
          {mode === 'manual' && parsedLeads.length > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-bold text-navy-700 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gold-500 rounded-full" />توزيع كل عميل على موظف
                </h4>
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 px-3 rounded-xl border border-gray-200/50">
                  <span className="text-[11px] font-bold text-gray-500">تعيين الكل لـ:</span>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const newAssign: Record<string, string> = {};
                        parsedLeads.forEach((lead, idx) => {
                          newAssign[lead.phone || idx.toString()] = val;
                        });
                        setManualAssignments(newAssign);
                      }
                    }}
                    className="form-input py-1 px-2 text-xs bg-white w-40 font-semibold"
                  >
                    <option value="">اختر موظفاً...</option>
                    {salesEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedLeads.slice(0, 100).map((lead, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-400" dir="ltr">{lead.phone}</p>
                    </div>
                    <select
                      value={manualAssignments[lead.phone || idx.toString()] || ''}
                      onChange={(e) => setManualAssignments((prev) => ({ ...prev, [lead.phone || idx.toString()]: e.target.value }))}
                      className="form-input w-48 py-1.5 text-xs font-semibold text-navy-950 bg-white"
                    >
                      <option value="">اختر موظفاً...</option>
                      {salesEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {parsedLeads.length > 100 && (
                  <p className="text-center text-xs text-gray-400 p-2">عرض أول 100 عميل</p>
                )}
              </div>
            </div>
          )}

          {/* Auto preview */}
          {mode === 'auto' && parsedLeads.length > 0 && selectedEmployeeIds.length > 0 && (
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-sm text-emerald-700">
                سيتم توزيع <span className="font-bold">{parsedLeads.length}</span> عميل على{' '}
                <span className="font-bold">{selectedEmployeeIds.length}</span> موظف تقريباً{' '}
                <span className="font-bold">{Math.ceil(parsedLeads.length / selectedEmployeeIds.length)}</span> عميل لكل موظف
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button onClick={distribute} disabled={distributing} className="btn-gold">
            {distributing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                جارٍ التوزيع...
              </span>
            ) : <>توزيع العملاء</>}
          </button>
        </div>
      </div>
    </div>
  );
}
