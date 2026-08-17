import { useState } from 'react';
import { Share2, Facebook, Send, Link2, Check, X } from 'lucide-react';

interface Props {
  title: string;
  label?: string;
  compact?: boolean;
}

export default function ShareButton({ title, label = 'مشاركة', compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${title} — Promise للسياحة والسفر`;

  const share = (platform: 'facebook' | 'whatsapp' | 'copy') => {
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'copy') {
      navigator.clipboard?.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`flex items-center gap-1.5 rounded-xl font-bold transition-all ${
          compact
            ? 'w-9 h-9 justify-center bg-white/90 backdrop-blur text-emerald-950 hover:bg-white shadow-sm'
            : 'px-3 py-2 text-xs bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
        }`}
        aria-label={label}
      >
        <Share2 size={compact ? 16 : 14} />
        {!compact && <span>{label}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[200px] animate-fadeIn">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-gray-500">شارك على</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <div className="space-y-1">
              <button
                onClick={(e) => { e.stopPropagation(); share('facebook'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Facebook size={16} /></div>
                <span className="text-sm font-semibold text-gray-700">فيسبوك</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); share('whatsapp'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Send size={16} /></div>
                <span className="text-sm font-semibold text-gray-700">واتساب</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); share('copy'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950 text-gold-400 flex items-center justify-center">
                  {copied ? <Check size={16} /> : <Link2 size={16} />}
                </div>
                <span className="text-sm font-semibold text-gray-700">{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
