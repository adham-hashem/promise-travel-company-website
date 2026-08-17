const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Cleanup all the messed up imports
content = content.replace(/import \{ Crown, Shield, FileOutput, BookOpen,  Crown, Shield, FileOutput, BookOpen,  useState \} from 'react';/, "import { useState } from 'react';");
content = content.replace(/import \{ Crown, Shield, FileOutput, BookOpen,  Crown, Shield, FileOutput, BookOpen, \n  LayoutDashboard,/, "import {\n  Crown, Shield, FileOutput, BookOpen,\n  LayoutDashboard,");
content = content.replace(/import \{ Crown, Shield, FileOutput, BookOpen,  useAuth \} from '\.\.\/contexts\/AuthContext';/, "import { useAuth } from '../contexts/AuthContext';");

fs.writeFileSync('src/components/Sidebar.tsx', content);
