const fs = require('fs');
let content = fs.readFileSync('src/pages/SuperAdminPanel.tsx', 'utf8');

// 1. Remove imported missing functions
content = content.replace('import { ALL_PAGES, PERMISSION_GROUPS, getDefaultPagePermissions, type Permissions } from \'../lib/permissions\';', 'import { PERMISSION_GROUPS, type Permissions } from \'../lib/permissions\';');

// 2. Remove page_permissions from ProfileItem
content = content.replace('  page_permissions?: Record<string, boolean>;\n', '');

// 3. Fix handleSelectUser
const handleSelectUserRegex = /const handleSelectUser = [^{]+\{\s*setSelectedAdmin\(p\);\s*setMessage\(''\);\s*(.*?)\s*setActionPerms/s;
const match = content.match(handleSelectUserRegex);
if (match) {
  content = content.replace(match[1], `// Permissions now handled via actionPerms only
      setPagePerms({});
      `);
}

// 4. Fix handleSavePermissions
const handleSaveRegex = /const handleSavePermissions = [^{]+\{\s*setSaving\(true\);\s*setMessage\(''\);\s*try \{\s*(.*?)\s*const \{ error \} =/s;
const match2 = content.match(handleSaveRegex);
if (match2) {
  content = content.replace(match2[1], `// Save only permissions
      `);
}

// 5. Remove 'page_permissions: pagePerms,' from supabase update
content = content.replace(/permissions: actionPerms,\s*page_permissions: pagePerms,/, 'permissions: actionPerms,');

// 6. Remove the section rendering 'Page Access' entirely (if possible) or just make it empty.
const pageAccessSectionRegex = /<h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">[\s\S]*?<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
content = content.replace(pageAccessSectionRegex, '<!-- Page access removed in new_frontend -->');

fs.writeFileSync('src/pages/SuperAdminPanel.tsx', content);
