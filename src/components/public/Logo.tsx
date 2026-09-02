interface Props {
  size?: number;
  className?: string;
  withText?: boolean;
  variant?: 'light' | 'dark';
}

// Uses the provided Promise logo (public asset). `withText` adds the brand name.
export default function Logo({ size = 40, className = '', withText = false, variant = 'dark' }: Props) {
  const textColor = variant === 'light' ? 'text-white' : 'text-emerald-950';
  const subColor = variant === 'light' ? 'text-gold-300' : 'text-gold-600';
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/images/WhatsApp_Image_2026-08-16_at_6.55.03_PM.jpeg"
        alt="Promise Travel"
        style={{ width: size, height: size }}
        className="rounded-xl object-cover shadow-md ring-1 ring-white/20"
      />
      {withText && (
        <div className="leading-tight">
          <p className={`font-black text-lg ${textColor}`}>Promise</p>
          <p className={`text-[10px] font-semibold tracking-wide ${subColor}`}>بروميس للسياحة والسفر</p>
        </div>
      )}
    </div>
  );
}
