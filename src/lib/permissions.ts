export type UserRole = 'مالك النظام' | 'مدير المبيعات' | 'مندوب مبيعات' | 'محاسب' | 'موظف التشغيل';

export interface Permissions {
  // Customers
  customers_view: boolean;
  customers_add: boolean;
  customers_edit: boolean;
  customers_delete: boolean;
  // Bookings
  bookings_view: boolean;
  bookings_add: boolean;
  bookings_edit: boolean;
  bookings_delete: boolean;
  // Packages
  packages_view: boolean;
  packages_add: boolean;
  packages_edit: boolean;
  packages_delete: boolean;
  // Offers
  offers_view: boolean;
  offers_add: boolean;
  offers_edit: boolean;
  offers_delete: boolean;
  // Employees
  employees_view: boolean;
  employees_add: boolean;
  employees_edit: boolean;
  employees_delete: boolean;
  // Reports
  reports_view: boolean;
  reports_export_pdf: boolean;
  reports_export_excel: boolean;
  // Settings
  settings_access: boolean;
  settings_edit: boolean;
  // Accounting
  accounting_revenue: boolean;
  accounting_payments: boolean;
  accounting_installments: boolean;
  accounting_expenses: boolean;
  accounting_commissions: boolean;
  // Documents & Operations
  documents_upload: boolean;
  documents_review: boolean;
  documents_view: boolean;
  operations_access: boolean;
  operations_edit: boolean;
  operations_delete: boolean;
  vip_management_access: boolean;
  super_admin_access: boolean;
  // Hotels
  hotels_view: boolean;
  hotels_add: boolean;
  hotels_edit: boolean;
  hotels_delete: boolean;
  // Invoices
  invoices_view: boolean;
  invoices_add: boolean;
  invoices_edit: boolean;
  invoices_delete: boolean;
  // Inquiries
  inquiries_view: boolean;
  inquiries_add: boolean;
  inquiries_edit: boolean;
  inquiries_delete: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
  'مالك النظام': {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: true,
    bookings_view: true, bookings_add: true, bookings_edit: true, bookings_delete: true,
    packages_view: true, packages_add: true, packages_edit: true, packages_delete: true,
    offers_view: true, offers_add: true, offers_edit: true, offers_delete: true,
    employees_view: true, employees_add: true, employees_edit: true, employees_delete: true,
    reports_view: true, reports_export_pdf: true, reports_export_excel: true,
    settings_access: true, settings_edit: true,
    accounting_revenue: true, accounting_payments: true, accounting_installments: true, accounting_expenses: true, accounting_commissions: true,
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: true, vip_management_access: true, super_admin_access: true,
    hotels_view: true, hotels_add: true, hotels_edit: true, hotels_delete: true,
    invoices_view: true, invoices_add: true, invoices_edit: true, invoices_delete: true,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: true,
  },
  'مدير المبيعات': {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: false,
    bookings_view: true, bookings_add: true, bookings_edit: true, bookings_delete: false,
    packages_view: true, packages_add: true, packages_edit: true, packages_delete: false,
    offers_view: true, offers_add: true, offers_edit: true, offers_delete: false,
    employees_view: true, employees_add: true, employees_edit: true, employees_delete: false,
    reports_view: true, reports_export_pdf: true, reports_export_excel: true,
    settings_access: false, settings_edit: false,
    accounting_revenue: true, accounting_payments: false, accounting_installments: true, accounting_expenses: false, accounting_commissions: true,
    documents_upload: true, documents_review: false, documents_view: true, operations_access: true, operations_edit: false, operations_delete: false, vip_management_access: false, super_admin_access: false,
    hotels_view: true, hotels_add: true, hotels_edit: true, hotels_delete: false,
    invoices_view: true, invoices_add: true, invoices_edit: true, invoices_delete: false,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: true,
  },
  'مندوب مبيعات': {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: false,
    bookings_view: true, bookings_add: false, bookings_edit: false, bookings_delete: false,
    packages_view: true, packages_add: false, packages_edit: false, packages_delete: false,
    offers_view: true, offers_add: false, offers_edit: false, offers_delete: false,
    employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
    reports_view: false, reports_export_pdf: false, reports_export_excel: false,
    settings_access: false, settings_edit: false,
    accounting_revenue: false, accounting_payments: false, accounting_installments: false, accounting_expenses: false, accounting_commissions: false,
    documents_upload: true, documents_review: false, documents_view: true, operations_access: false, operations_edit: false, operations_delete: false, vip_management_access: false, super_admin_access: false,
    hotels_view: true, hotels_add: false, hotels_edit: false, hotels_delete: false,
    invoices_view: true, invoices_add: false, invoices_edit: false, invoices_delete: false,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: false,
  },
  'محاسب': {
    customers_view: false, customers_add: false, customers_edit: false, customers_delete: false,
    bookings_view: true, bookings_add: false, bookings_edit: false, bookings_delete: false,
    packages_view: false, packages_add: false, packages_edit: false, packages_delete: false,
    offers_view: false, offers_add: false, offers_edit: false, offers_delete: false,
    employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
    reports_view: true, reports_export_pdf: true, reports_export_excel: true,
    settings_access: false, settings_edit: false,
    accounting_revenue: true, accounting_payments: true, accounting_installments: true, accounting_expenses: true, accounting_commissions: false,
    documents_upload: false, documents_review: true, documents_view: true, operations_access: true, operations_edit: false, operations_delete: false, vip_management_access: false, super_admin_access: false,
    hotels_view: false, hotels_add: false, hotels_edit: false, hotels_delete: false,
    invoices_view: true, invoices_add: true, invoices_edit: true, invoices_delete: false,
    inquiries_view: false, inquiries_add: false, inquiries_edit: false, inquiries_delete: false,
  },
  'موظف التشغيل': {
    customers_view: true, customers_add: false, customers_edit: false, customers_delete: false,
    bookings_view: true, bookings_add: false, bookings_edit: false, bookings_delete: false,
    packages_view: true, packages_add: false, packages_edit: false, packages_delete: false,
    offers_view: false, offers_add: false, offers_edit: false, offers_delete: false,
    employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
    reports_view: false, reports_export_pdf: false, reports_export_excel: false,
    settings_access: false, settings_edit: false,
    accounting_revenue: false, accounting_payments: false, accounting_installments: false, accounting_expenses: false, accounting_commissions: false,
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: false, vip_management_access: false, super_admin_access: false,
    hotels_view: true, hotels_add: false, hotels_edit: false, hotels_delete: false,
    invoices_view: true, invoices_add: false, invoices_edit: false, invoices_delete: false,
    inquiries_view: false, inquiries_add: false, inquiries_edit: false, inquiries_delete: false,
  },
};

export function getDefaultPermissions(role: string): Permissions {
  if (role in DEFAULT_PERMISSIONS) {
    return { ...DEFAULT_PERMISSIONS[role as UserRole] };
  }
  // Roles outside the canonical UserRole (e.g. 'مدير النظام') get owner-style powers
  return { ...DEFAULT_PERMISSIONS['مالك النظام'] };
}

export const PERMISSION_GROUPS = [
  {
    label: 'العملاء',
    items: [
      { key: 'customers_view', label: 'عرض العملاء' },
      { key: 'customers_add', label: 'إضافة عميل' },
      { key: 'customers_edit', label: 'تعديل عميل' },
      { key: 'customers_delete', label: 'حذف عميل' },
    ],
  },
  {
    label: 'الحجوزات',
    items: [
      { key: 'bookings_view', label: 'عرض الحجوزات' },
      { key: 'bookings_add', label: 'إضافة حجز' },
      { key: 'bookings_edit', label: 'تعديل حجز' },
      { key: 'bookings_delete', label: 'حذف حجز' },
    ],
  },
  {
    label: 'الباقات',
    items: [
      { key: 'packages_view', label: 'عرض الباقات' },
      { key: 'packages_add', label: 'إضافة باقة' },
      { key: 'packages_edit', label: 'تعديل باقة' },
      { key: 'packages_delete', label: 'حذف باقة' },
    ],
  },
  {
    label: 'العروض',
    items: [
      { key: 'offers_view', label: 'عرض العروض' },
      { key: 'offers_add', label: 'إضافة عرض' },
      { key: 'offers_edit', label: 'تعديل عرض' },
      { key: 'offers_delete', label: 'حذف عرض' },
    ],
  },
  {
    label: 'الموظفون',
    items: [
      { key: 'employees_view', label: 'عرض الموظفين' },
      { key: 'employees_add', label: 'إضافة موظف' },
      { key: 'employees_edit', label: 'تعديل موظف' },
      { key: 'employees_delete', label: 'حذف موظف' },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { key: 'reports_view', label: 'عرض التقارير' },
      { key: 'reports_export_pdf', label: 'تصدير PDF' },
      { key: 'reports_export_excel', label: 'تصدير Excel' },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      { key: 'settings_access', label: 'الوصول للإعدادات' },
      { key: 'settings_edit', label: 'تعديل إعدادات النظام' },
    ],
  },
  {
    label: 'الحسابات',
    items: [
      { key: 'accounting_revenue', label: 'الإيرادات' },
      { key: 'accounting_payments', label: 'المدفوعات' },
      { key: 'accounting_installments', label: 'الأقساط' },
      { key: 'accounting_expenses', label: 'المصروفات' },
      { key: 'accounting_commissions', label: 'عمولات الموظفين' },
    ],
  },
  {
    label: 'المستندات والتشغيل',
    items: [
      { key: 'documents_upload', label: 'رفع المستندات' },
      { key: 'documents_view', label: 'عرض المستندات' },
      { key: 'documents_review', label: 'مراجعة المستندات' },
      { key: 'operations_access', label: 'لوحة التشغيل' },
      { key: 'operations_edit', label: 'تعديل ملفات التشغيل' },
      { key: 'operations_delete', label: 'حذف ملفات التشغيل' },
    ],
  },
  {
    label: 'الفنادق',
    items: [
      { key: 'hotels_view', label: 'عرض الفنادق' },
      { key: 'hotels_add', label: 'إضافة فندق' },
      { key: 'hotels_edit', label: 'تعديل فندق' },
      { key: 'hotels_delete', label: 'حذف فندق' },
    ],
  },
  {
    label: 'الفواتير',
    items: [
      { key: 'invoices_view', label: 'عرض الفواتير' },
      { key: 'invoices_add', label: 'إنشاء فاتورة' },
      { key: 'invoices_edit', label: 'تعديل فاتورة' },
      { key: 'invoices_delete', label: 'حذف فاتورة' },
    ],
  },
  {
    label: 'الاستعلامات',
    items: [
      { key: 'inquiries_view', label: 'عرض الاستعلامات' },
      { key: 'inquiries_add', label: 'إضافة استعلام' },
      { key: 'inquiries_edit', label: 'تعديل استعلام' },
      { key: 'inquiries_delete', label: 'حذف استعلام' },
    ],
  },
] as const;



