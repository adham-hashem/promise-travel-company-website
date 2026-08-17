import { MessageCircle, Facebook } from 'lucide-react';

export default function FloatingSocial() {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
      <a
        href="https://wa.me/201001234567"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all"
      >
        <MessageCircle size={26} />
      </a>
      <a
        href="https://www.facebook.com/Promisetravil"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="صفحة فيسبوك"
        className="w-14 h-14 rounded-full bg-[#1877F2] hover:bg-[#0b5fd6] text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all"
      >
        <Facebook size={26} />
      </a>
    </div>
  );
}
