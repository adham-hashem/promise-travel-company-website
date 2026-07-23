import type { ReactNode } from 'react';
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
  return (
    <div className="min-h-screen bg-gray-50 font-cairo" dir="rtl">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} />
      <Header
        currentPage={currentPage}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onNavigate={onNavigate}
      />
      <main className="mr-64 pt-16 min-h-screen">
        <div className="p-6 animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}
