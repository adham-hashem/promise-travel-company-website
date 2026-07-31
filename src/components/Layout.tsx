import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import type { Page } from '../types';

interface Props {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page, id?: string) => void;
  onLogout: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
}

export default function Layout({ children, currentPage, onNavigate, onLogout, searchValue, onSearchChange }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-cairo" dir="rtl">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={(p) => { onNavigate(p); setSidebarOpen(false); }} 
        onLogout={onLogout} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Header
        currentPage={currentPage}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onNavigate={onNavigate}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Sidebar Backdrop for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="mr-0 md:mr-64 pt-16 min-h-screen">
        <div className="p-4 md:p-6 animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}
