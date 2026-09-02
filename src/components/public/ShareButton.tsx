import { useState } from 'react';
import { Share2, Facebook, Send, Link2, Check, X, Mail, MessageCircle, MoreHorizontal } from 'lucide-react';

interface Props {
  title: string;
  label?: string;
  compact?: boolean;
  shareUrl?: string;
}

type Platform = 'native' | 'facebook' | 'whatsapp' | 'telegram' | 'messenger' | 'email' | 'copy';

export default function ShareButton({ title, label = 'مشاركة', compact = false, shareUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = `${title} — Promise للسياحة والسفر`;
  const shareBody = `${shareText}\n${url}`;

  const share = (platform: Platform) => {
    if (platform === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: shareText, text: shareText, url }).catch(() => {});
      setOpen(false);
      return;
    }
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareBody)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'messenger') {
      window.open(`https://www.facebook.com/dialog/send?app_id=0&link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareBody)}`;
    } else if (platform === 'copy') {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const platforms: { id: Platform; label: string; icon: typeof Facebook; color: string; show: boolean }[] = [
    { id: 'native', label: 'مشاركة مباشرة', icon: MoreHorizontal, color: 'bg-gray-700 text-white', show: hasNativeShare },
    { id: 'whatsapp', label: 'واتساب', icon: Send, color: 'bg-emerald-500 text-white', show: true },
    { id: 'facebook', label: 'فيسبوك', icon: Facebook, color: 'bg-blue-600 text-white', show: true },
    { id: 'telegram', label: 'تيليجرام', icon: Send, color: 'bg-sky-500 text-white', show: true },
    { id: 'messenger', label: 'ماسنجر', icon: MessageCircle, color: 'bg-violet-600 text-white', show: true },
    { id: 'email', label: 'بريد إلكتروني', icon: Mail, color: 'bg-amber-600 text-white', show: true },
    { id: 'copy', label: copied ? 'تم نسخ الرابط' : 'نسخ الرابط', icon: copied ? Check : Link2, color: 'bg-emerald-950 text-gold-400', show: true },
  ];

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
          <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[210px] animate-fadeIn">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-gray-500">شارك على</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <div className="space-y-1">
              {platforms.filter((p) => p.show).map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); share(p.id); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-right"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
