import JSZip from 'jszip';
import { supabase } from './supabase';

export type DocExportType = 'visa' | 'passport' | 'national_id' | 'personal_photo' | 'flight_tickets' | 'all_documents';

interface ExportConfig {
  label: string;
  folderSuffix: string;
}

const exportConfig: Record<DocExportType, ExportConfig> = {
  visa: { label: 'تأشيرة', folderSuffix: 'Visas' },
  passport: { label: 'جواز السفر', folderSuffix: 'Passports' },
  national_id: { label: 'البطاقة الشخصية', folderSuffix: 'NationalIDs' },
  personal_photo: { label: 'صورة شخصية', folderSuffix: 'Photos' },
  flight_tickets: { label: 'تذاكر الطيران', folderSuffix: 'Flight Tickets' },
  all_documents: { label: 'كل المستندات', folderSuffix: 'Documents' },
};

interface CustomerInfo {
  id: string;
  client_code?: string;
  name: string;
}

interface FileEntry {
  path: string;
  name: string;
  customerId: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'unknown';
}

function formatDateForFolder(d?: string): string {
  if (!d) return 'NoDate';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function downloadFile(filePath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from('documents').download(filePath);
  if (error || !data) return null;
  return data;
}

function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? '.' + parts.pop() : '';
}

export interface ExportResult {
  success: boolean;
  downloadedCount: number;
  skippedCustomers: string[];
  error?: string;
}

/**
 * Collects all file entries for a given document type across all customers in a group.
 */
async function collectFiles(
  docType: DocExportType,
  customerIds: string[],
  customers: CustomerInfo[],
): Promise<{ files: FileEntry[]; missingCustomers: string[] }> {
  const files: FileEntry[] = [];
  const missingCustomers: string[] = [];
  const customerMap = new Map(customerIds.map((id) => [id, customers.find((c) => c.id === id)]));

  if (docType === 'visa') {
    // Visa files are in visa_management.visa_file_path
    const { data: visaRecords } = await supabase
      .from('visa_management')
      .select('customer_id, visa_file_path, visa_file_name')
      .in('customer_id', customerIds)
      .not('visa_file_path', 'is', null);

    const foundCustomers = new Set<string>();
    for (const v of visaRecords || []) {
      if (!v.visa_file_path) continue;
      const cust = customerMap.get(v.customer_id);
      if (!cust) continue;
      foundCustomers.add(v.customer_id);
      files.push({
        path: v.visa_file_path,
        name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)}${getExtension(v.visa_file_name || v.visa_file_path)}`,
        customerId: v.customer_id,
      });
    }
    // Also check visa_documents table
    const { data: visaDocs } = await supabase
      .from('visa_documents')
      .select('visa_id, file_path, file_name, visa_management(customer_id)')
      .in('visa_id', (visaRecords || []).map((v) => v.id))
      .not('file_path', 'is', null);

    for (const vd of visaDocs || []) {
      const customerId = (vd.visa_management as any)?.customer_id;
      if (!customerId || foundCustomers.has(customerId)) continue;
      const cust = customerMap.get(customerId);
      if (!cust) continue;
      foundCustomers.add(customerId);
      files.push({
        path: vd.file_path,
        name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)}${getExtension(vd.file_name || vd.file_path)}`,
        customerId,
      });
    }

    // Missing customers
    for (const id of customerIds) {
      if (!foundCustomers.has(id)) {
        const cust = customerMap.get(id);
        if (cust) missingCustomers.push(cust.name);
      }
    }
  } else if (docType === 'all_documents') {
    // Collect from documents table + visa_management + visa_documents + flight_tickets
    const docTypeFilter = ['جواز سفر', 'بطاقة رقم قومي', 'صورة شخصية', 'مستند إضافي', 'تأشيرة'];

    const { data: docs } = await supabase
      .from('documents')
      .select('customer_id, file_path, file_name, doc_type')
      .in('customer_id', customerIds)
      .in('doc_type', docTypeFilter)
      .not('file_path', 'is', null);

    const foundCustomers = new Set<string>();
    for (const d of docs || []) {
      if (!d.file_path) continue;
      const cust = customerMap.get(d.customer_id);
      if (!cust) continue;
      foundCustomers.add(d.customer_id);
      files.push({
        path: d.file_path,
        name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)} - ${d.doc_type}${getExtension(d.file_name || d.file_path)}`,
        customerId: d.customer_id,
      });
    }

    // Visa files
    const { data: visaRecords } = await supabase
      .from('visa_management')
      .select('customer_id, visa_file_path, visa_file_name')
      .in('customer_id', customerIds)
      .not('visa_file_path', 'is', null);

    for (const v of visaRecords || []) {
      if (!v.visa_file_path) continue;
      const cust = customerMap.get(v.customer_id);
      if (!cust) continue;
      foundCustomers.add(v.customer_id);
      files.push({
        path: v.visa_file_path,
        name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)} - تأشيرة${getExtension(v.visa_file_name || v.visa_file_path)}`,
        customerId: v.customer_id,
      });
    }

    // Flight tickets
    const { data: tickets } = await supabase
      .from('flight_tickets')
      .select('customer_id, ticket_file_path, ticket_file_name')
      .in('customer_id', customerIds)
      .not('ticket_file_path', 'is', null);

    for (const t of tickets || []) {
      if (!t.ticket_file_path) continue;
      const cust = customerMap.get(t.customer_id);
      if (!cust) continue;
      foundCustomers.add(t.customer_id);
      files.push({
        path: t.ticket_file_path,
        name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)} - تذكرة طيران${getExtension(t.ticket_file_name || t.ticket_file_path)}`,
        customerId: t.customer_id,
      });
    }

    for (const id of customerIds) {
      if (!foundCustomers.has(id)) {
        const cust = customerMap.get(id);
        if (cust) missingCustomers.push(cust.name);
      }
    }
  } else {
    // passport, national_id, personal_photo, flight_tickets — from documents table by doc_type
    const docTypeMap: Record<DocExportType, string[]> = {
      passport: ['جواز سفر', 'جواز السفر'],
      national_id: ['بطاقة رقم قومي'],
      personal_photo: ['صورة شخصية'],
      visa: [],
      flight_tickets: ['حجز طيران', 'تذكرة طيران'],
      all_documents: [],
    };
    const types = docTypeMap[docType];

    const { data: docs } = await supabase
      .from('documents')
      .select('customer_id, file_path, file_name, doc_type')
      .in('customer_id', customerIds)
      .in('doc_type', types)
      .not('file_path', 'is', null);

    const foundCustomers = new Set<string>();
    for (const d of docs || []) {
      if (!d.file_path) continue;
      const cust = customerMap.get(d.customer_id);
      if (!cust) continue;
      foundCustomers.add(d.customer_id);
      files.push({
        path: d.file_path,
        name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)}${getExtension(d.file_name || d.file_path)}`,
        customerId: d.customer_id,
      });
    }

    // For flight tickets, also check the flight_tickets table for ticket_file_path
    if (docType === 'flight_tickets') {
      const { data: tickets } = await supabase
        .from('flight_tickets')
        .select('customer_id, ticket_file_path, ticket_file_name')
        .in('customer_id', customerIds)
        .not('ticket_file_path', 'is', null);

      for (const t of tickets || []) {
        if (!t.ticket_file_path) continue;
        const cust = customerMap.get(t.customer_id);
        if (!cust) continue;
        foundCustomers.add(t.customer_id);
        files.push({
          path: t.ticket_file_path,
          name: `${cust.client_code || 'NoCode'} - ${sanitizeFileName(cust.name)}${getExtension(t.ticket_file_name || t.ticket_file_path)}`,
          customerId: t.customer_id,
        });
      }
    }

    for (const id of customerIds) {
      if (!foundCustomers.has(id)) {
        const cust = customerMap.get(id);
        if (cust) missingCustomers.push(cust.name);
      }
    }
  }

  return { files, missingCustomers };
}

/**
 * Generates and downloads a ZIP folder containing documents for all customers in a travel group.
 */
export async function exportGroupDocuments(
  docType: DocExportType,
  groupName: string,
  travelDate: string | undefined,
  customerIds: string[],
  customers: CustomerInfo[],
  onProgress?: (current: number, total: number) => void,
): Promise<ExportResult> {
  if (customerIds.length === 0) {
    return { success: false, downloadedCount: 0, skippedCustomers: [], error: 'لا يوجد عملاء في هذه المجموعة' };
  }

  const { files, missingCustomers } = await collectFiles(docType, customerIds, customers);

  if (files.length === 0) {
    return {
      success: false,
      downloadedCount: 0,
      skippedCustomers: missingCustomers,
      error: `لا توجد ملفات ${exportConfig[docType].label} مرفوعة لأي عميل في هذه المجموعة`,
    };
  }

  const zip = new JSZip();
  let downloadedCount = 0;

  // Download files in parallel batches of 5 for efficiency
  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (f) => {
        const blob = await downloadFile(f.path);
        onProgress?.(Math.min(i + batch.length, files.length), files.length);
        return { file: f, blob };
      })
    );

    for (const { file, blob } of results) {
      if (blob) {
        // Ensure unique filenames within the zip
        let uniqueName = file.name;
        let counter = 1;
        while (zip.file(uniqueName)) {
          const ext = getExtension(uniqueName);
          const base = uniqueName.replace(ext, '');
          uniqueName = `${base} (${counter})${ext}`;
          counter++;
        }
        zip.file(uniqueName, blob);
        downloadedCount++;
      }
    }
  }

  if (downloadedCount === 0) {
    return {
      success: false,
      downloadedCount: 0,
      skippedCustomers: missingCustomers,
      error: 'فشل تحميل جميع الملفات من التخزين',
    };
  }

  // Generate ZIP
  const dateStr = formatDateForFolder(travelDate);
  const zipName = `${sanitizeFileName(groupName)} - ${dateStr} - ${exportConfig[docType].folderSuffix}`;
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, downloadedCount, skippedCustomers: missingCustomers };
}
