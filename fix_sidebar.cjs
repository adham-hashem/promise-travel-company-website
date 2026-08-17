const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Add icons to import
if (!content.includes('Crown')) {
  content = content.replace('LayoutDashboard,', 'LayoutDashboard, Crown, Shield, FileOutput, BookOpen,');
}

// Add Sales routes
const salesRegex = /\{ id: 'inquiries',[^}]+\},/;
if (content.match(salesRegex) && !content.includes('sales-portal')) {
  content = content.replace(salesRegex, `$&
      { id: 'sales-portal', label: 'بوابة المبيعات', icon: BookOpen, permissionKey: 'inquiries_view' },
      { id: 'quotation-form', label: 'عروض الأسعار', icon: FileOutput, permissionKey: 'inquiries_view' },`);
}

// Add VIP section before HR section
const hrRegex = /\{\s*id:\s*'hr',/;
if (content.match(hrRegex) && !content.includes("id: 'vip'")) {
  content = content.replace(hrRegex, `{
    id: 'vip',
    label: 'رحلات VIP',
    icon: Crown,
    anyPermission: ['vip_management_access'],
    items: [
      { id: 'vip-trips', label: 'إدارة رحلات VIP', icon: Crown, permissionKey: 'vip_management_access' },
    ],
  },
  $&`);
}

// Add Super Admin inside Settings
const settingsSectionRegex = /anyPermission:\s*\['settings_access'\]/;
if (content.match(settingsSectionRegex) && !content.includes('super_admin_access')) {
  content = content.replace(settingsSectionRegex, `anyPermission: ['settings_access', 'super_admin_access']`);
}

const settingsItemRegex = /\{ id: 'settings',[^}]+\},/;
if (content.match(settingsItemRegex) && !content.includes('super-admin')) {
  content = content.replace(settingsItemRegex, `$&
      { id: 'super-admin', label: 'لوحة الإدارة العليا', icon: Shield, permissionKey: 'super_admin_access' },`);
}

fs.writeFileSync('src/components/Sidebar.tsx', content);
