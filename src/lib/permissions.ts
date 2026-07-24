export type UserRole = 'super_admin' | 'مالك النظام' | 'مدير النظام' | 'إضافة عملاء' | 'مدير المبيعات' | 'مندوب مبيعات' | 'محاسب' | 'موظف التشغيل' | 'مسؤول طيران';

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

export type PageKey = 
  | 'dashboard'
  | 'inquiries'
  | 'customers'
  | 'customer-add'
  | 'customer-details'
  | 'revenue'
  | 'payments'
  | 'installments'
  | 'expenses'
  | 'commissions'
  | 'invoices'
  | 'operations'
  | 'visa'
  | 'flight-tickets'
  | 'client-search'
  | 'bookings'
  | 'packages'
  | 'offers'
  | 'hotels'
  | 'internal-trips'
  | 'internal-bookings'
  | 'internal-customers'
  | 'internal-reports'
  | 'suppliers'
  | 'tasks'
  | 'calendar'
  | 'profit'
  | 'reports'
  | 'employees'
  | 'settings'
  | 'super-admin';

export const ALL_PAGES: { key: PageKey; label: string; group: string }[] = [
  { key: 'dashboard', label: 'لوحة التحكم', group: 'الرئيسية' },
  { key: 'client-search', label: 'البحث الذكي', group: 'الرئيسية' },
  { key: 'inquiries', label: 'الاستعلامات (المسار الأول)', group: 'المسار والتسلسل' },
  { key: 'customers', label: 'العملاء CRM', group: 'المسار والتسلسل' },
  { key: 'revenue', label: 'قسم الحسابات - الإيرادات', group: 'المسار والتسلسل' },
  { key: 'payments', label: 'قسم الحسابات - المدفوعات', group: 'المسار والتسلسل' },
  { key: 'operations', label: 'قسم التشغيل', group: 'المسار والتسلسل' },
  { key: 'flight-tickets', label: 'قسم الطيران', group: 'المسار والتسلسل' },
  { key: 'visa', label: 'إدارة التأشيرات', group: 'إدارة المبيعات والأعمال' },
  { key: 'bookings', label: 'الحجوزات', group: 'إدارة المبيعات والأعمال' },
  { key: 'packages', label: 'الباقات', group: 'إدارة المبيعات والأعمال' },
  { key: 'offers', label: 'العروض', group: 'إدارة المبيعات والأعمال' },
  { key: 'hotels', label: 'إدارة الفنادق', group: 'إدارة المبيعات والأعمال' },
  { key: 'invoices', label: 'الفواتير', group: 'الحسابات والتكاليف' },
  { key: 'installments', label: 'الأقساط', group: 'الحسابات والتكاليف' },
  { key: 'expenses', label: 'المصروفات والتكاليف', group: 'الحسابات والتكاليف' },
  { key: 'commissions', label: 'العمولات', group: 'الحسابات والتكاليف' },
  { key: 'profit', label: 'تحليل الأرباح', group: 'التقارير والإدارة' },
  { key: 'reports', label: 'التقارير الشاملة', group: 'التقارير والإدارة' },
  { key: 'employees', label: 'إدارة الموظفين والشركاء', group: 'الإدارة والتحكم' },
  { key: 'settings', label: 'إعدادات النظام', group: 'الإدارة والتحكم' },
  { key: 'super-admin', label: 'لوحة التحكم الفائقة Super Admin', group: 'الإدارة والتحكم' },
];

export const DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
  super_admin: {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: true,
    bookings_view: true, bookings_add: true, bookings_edit: true, bookings_delete: true,
    packages_view: true, packages_add: true, packages_edit: true, packages_delete: true,
    offers_view: true, offers_add: true, offers_edit: true, offers_delete: true,
    employees_view: true, employees_add: true, employees_edit: true, employees_delete: true,
    reports_view: true, reports_export_pdf: true, reports_export_excel: true,
    settings_access: true, settings_edit: true,
    accounting_revenue: true, accounting_payments: true, accounting_installments: true, accounting_expenses: true, accounting_commissions: true,
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: true,
    hotels_view: true, hotels_add: true, hotels_edit: true, hotels_delete: true,
    invoices_view: true, invoices_add: true, invoices_edit: true, invoices_delete: true,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: true,
  },
  'مالك النظام': {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: true,
    bookings_view: true, bookings_add: true, bookings_edit: true, bookings_delete: true,
    packages_view: true, packages_add: true, packages_edit: true, packages_delete: true,
    offers_view: true, offers_add: true, offers_edit: true, offers_delete: true,
    employees_view: true, employees_add: true, employees_edit: true, employees_delete: true,
    reports_view: true, reports_export_pdf: true, reports_export_excel: true,
    settings_access: true, settings_edit: true,
    accounting_revenue: true, accounting_payments: true, accounting_installments: true, accounting_expenses: true, accounting_commissions: true,
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: true,
    hotels_view: true, hotels_add: true, hotels_edit: true, hotels_delete: true,
    invoices_view: true, invoices_add: true, invoices_edit: true, invoices_delete: true,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: true,
  },
  'مدير النظام': {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: true,
    bookings_view: true, bookings_add: true, bookings_edit: true, bookings_delete: true,
    packages_view: true, packages_add: true, packages_edit: true, packages_delete: true,
    offers_view: true, offers_add: true, offers_edit: true, offers_delete: true,
    employees_view: true, employees_add: true, employees_edit: true, employees_delete: true,
    reports_view: true, reports_export_pdf: true, reports_export_excel: true,
    settings_access: true, settings_edit: true,
    accounting_revenue: true, accounting_payments: true, accounting_installments: true, accounting_expenses: true, accounting_commissions: true,
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: true,
    hotels_view: true, hotels_add: true, hotels_edit: true, hotels_delete: true,
    invoices_view: true, invoices_add: true, invoices_edit: true, invoices_delete: true,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: true,
  },
  'إضافة عملاء': {
    customers_view: true, customers_add: true, customers_edit: true, customers_delete: false,
    bookings_view: false, bookings_add: false, bookings_edit: false, bookings_delete: false,
    packages_view: true, packages_add: false, packages_edit: false, packages_delete: false,
    offers_view: false, offers_add: false, offers_edit: false, offers_delete: false,
    employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
    reports_view: false, reports_export_pdf: false, reports_export_excel: false,
    settings_access: false, settings_edit: false,
    accounting_revenue: false, accounting_payments: false, accounting_installments: false, accounting_expenses: false, accounting_commissions: false,
    documents_upload: true, documents_review: false, documents_view: true, operations_access: false, operations_edit: false, operations_delete: false,
    hotels_view: false, hotels_add: false, hotels_edit: false, hotels_delete: false,
    invoices_view: false, invoices_add: false, invoices_edit: false, invoices_delete: false,
    inquiries_view: true, inquiries_add: true, inquiries_edit: true, inquiries_delete: false,
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
    documents_upload: true, documents_review: false, documents_view: true, operations_access: true, operations_edit: false, operations_delete: false,
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
    documents_upload: true, documents_review: false, documents_view: true, operations_access: false, operations_edit: false, operations_delete: false,
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
    documents_upload: false, documents_review: true, documents_view: true, operations_access: true, operations_edit: false, operations_delete: false,
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
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: false,
    hotels_view: true, hotels_add: false, hotels_edit: false, hotels_delete: false,
    invoices_view: true, invoices_add: false, invoices_edit: false, invoices_delete: false,
    inquiries_view: false, inquiries_add: false, inquiries_edit: false, inquiries_delete: false,
  },
  'مسؤول طيران': {
    customers_view: true, customers_add: false, customers_edit: false, customers_delete: false,
    bookings_view: true, bookings_add: false, bookings_edit: false, bookings_delete: false,
    packages_view: true, packages_add: false, packages_edit: false, packages_delete: false,
    offers_view: false, offers_add: false, offers_edit: false, offers_delete: false,
    employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
    reports_view: false, reports_export_pdf: false, reports_export_excel: false,
    settings_access: false, settings_edit: false,
    accounting_revenue: false, accounting_payments: false, accounting_installments: false, accounting_expenses: false, accounting_commissions: false,
    documents_upload: true, documents_review: true, documents_view: true, operations_access: true, operations_edit: true, operations_delete: false,
    hotels_view: false, hotels_add: false, hotels_edit: false, hotels_delete: false,
    invoices_view: false, invoices_add: false, invoices_edit: false, invoices_delete: false,
    inquiries_view: false, inquiries_add: false, inquiries_edit: false, inquiries_delete: false,
  },
};

export function getDefaultPermissions(role: string): Permissions {
  if (role in DEFAULT_PERMISSIONS) {
    return { ...DEFAULT_PERMISSIONS[role as UserRole] };
  }
  return { ...DEFAULT_PERMISSIONS['مالك النظام'] };
}

export function getDefaultPagePermissions(role: string): Record<string, boolean> {
  const pages: Record<string, boolean> = {};
  if (role === 'super_admin' || role === 'مالك النظام' || role === 'مدير النظام') {
    ALL_PAGES.forEach(p => { pages[p.key] = true; });
  } else if (role === 'إضافة عملاء') {
    pages['dashboard'] = true;
    pages['client-search'] = true;
    pages['inquiries'] = true;
    pages['customers'] = true;
    pages['customer-add'] = true;
    pages['customer-details'] = true;
  } else if (role === 'محاسب') {
    pages['dashboard'] = true;
    pages['client-search'] = true;
    pages['revenue'] = true;
    pages['payments'] = true;
    pages['installments'] = true;
    pages['expenses'] = true;
    pages['commissions'] = true;
    pages['invoices'] = true;
  } else if (role === 'موظف التشغيل') {
    pages['dashboard'] = true;
    pages['client-search'] = true;
    pages['operations'] = true;
    pages['visa'] = true;
  } else if (role === 'مسؤول طيران') {
    pages['dashboard'] = true;
    pages['client-search'] = true;
    pages['flight-tickets'] = true;
  } else {
    pages['dashboard'] = true;
    pages['client-search'] = true;
    pages['inquiries'] = true;
    pages['customers'] = true;
    pages['bookings'] = true;
  }
  return pages;
}

export const PERMISSION_GROUPS = [
  {
    label: 'الاستعلامات',
    items: [
      { key: 'inquiries_view', label: 'عرض الاستعلامات' },
      { key: 'inquiries_add', label: 'إضافة استعلام' },
      { key: 'inquiries_edit', label: 'تعديل استعلام' },
      { key: 'inquiries_delete', label: 'حذف استعلام' },
    ],
  },
  {
    label: 'العملاء CRM',
    items: [
      { key: 'customers_view', label: 'عرض العملاء' },
      { key: 'customers_add', label: 'إضافة عميل' },
      { key: 'customers_edit', label: 'تعديل عميل' },
      { key: 'customers_delete', label: 'حذف عميل' },
    ],
  },
  {
    label: 'الحسابات والتكاليف',
    items: [
      { key: 'accounting_revenue', label: 'إيرادات الشركة' },
      { key: 'accounting_payments', label: 'سندات الدفع والاعتماد' },
      { key: 'accounting_installments', label: 'إدارة الأقساط' },
      { key: 'accounting_expenses', label: 'المصروفات والتكاليف' },
      { key: 'accounting_commissions', label: 'عمولات الموظفين' },
      { key: 'invoices_view', label: 'عرض الفواتير' },
      { key: 'invoices_add', label: 'إنشاء فاتورة' },
    ],
  },
  {
    label: 'التشغيل والتأشيرات',
    items: [
      { key: 'operations_access', label: 'لوحة قسم التشغيل' },
      { key: 'operations_edit', label: 'تعديل وثائق التشغيل' },
      { key: 'documents_upload', label: 'رفع المستندات والجوازات' },
      { key: 'documents_view', label: 'معاينة وتنزيل المستندات' },
    ],
  },
  {
    label: 'الحجوزات والباقات والعروض',
    items: [
      { key: 'bookings_view', label: 'عرض الحجوزات' },
      { key: 'bookings_add', label: 'إضافة حجز' },
      { key: 'packages_view', label: 'عرض الباقات' },
      { key: 'offers_view', label: 'عرض العروض' },
    ],
  },
  {
    label: 'إدارة الموظفين والإعدادات',
    items: [
      { key: 'employees_view', label: 'عرض الموظفين' },
      { key: 'employees_add', label: 'إضافة موظفين' },
      { key: 'employees_edit', label: 'تعديل موظفين' },
      { key: 'settings_access', label: 'إعدادات النظام' },
    ],
  },
] as const;
