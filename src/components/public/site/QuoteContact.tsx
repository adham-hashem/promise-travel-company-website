import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PROGRAM_NAMES, SITE, waLink } from './siteData';
import { SectionHead } from './sections';
import { useToast } from './useToast';

export interface QuoteContactHandle {
  /** Select a program in the form, scroll the section into view and focus the name field. */
  prefill: (program: string) => void;
}

interface Props {
  id?: string;
  initialProgram?: string;
  /** Hide the section heading (e.g. when the page hero already says "تواصل معنا"). */
  hideHead?: boolean;
  onBooking?: () => void;
}

export function PhoneList({ onCopied }: { onCopied: (m: string) => void }) {
  const copy = (p: string) => {
    try {
      navigator.clipboard.writeText(p).then(() => onCopied(`تم نسخ الرقم ${p}`), () => onCopied(p));
    } catch {
      onCopied(p);
    }
  };
  return (
    <div className="pm-phones">
      {SITE.phones.map((p) => (
        <div key={p} className="pm-phone">
          <a className="pm-num" href={`tel:+2${p}`}>{p}</a>
          <button type="button" className="pm-copy" onClick={() => copy(p)}>نسخ</button>
        </div>
      ))}
    </div>
  );
}

export function ContactInfoPanel({ onCopied }: { onCopied: (m: string) => void }) {
  return (
    <aside className="pm-panel pm-info">
      <h3>{SITE.name}</h3>
      <p className="pm-panel-lead" style={{ color: 'var(--on-teal-muted)' }}>ترخيص وزارة السياحة رقم <span className="pm-num">{SITE.license}</span></p>
      <dl>
        <div><dt>العنوان</dt><dd>{SITE.address}</dd></div>
        <div><dt>أرقام الحجز والاستفسار</dt><dd><PhoneList onCopied={onCopied} /></dd></div>
        <div><dt>البريد الإلكتروني</dt><dd><a className="pm-num" href={`mailto:${SITE.email}`} style={{ textDecoration: 'none' }}>{SITE.email}</a></dd></div>
        <div><dt>فيسبوك</dt><dd><a href={SITE.facebook} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textUnderlineOffset: 4 }}>{SITE.facebookLabel}</a></dd></div>
        <div><dt>إنستجرام</dt><dd><a className="pm-num" href={SITE.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textUnderlineOffset: 4 }}>{SITE.instagramLabel}</a></dd></div>
      </dl>
    </aside>
  );
}

const QuoteContact = forwardRef<QuoteContactHandle, Props>(function QuoteContact({ id = 'contact', initialProgram, hideHead, onBooking }, ref) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState(initialProgram && PROGRAM_NAMES.includes(initialProgram) ? initialProgram : PROGRAM_NAMES[0]);
  const [count, setCount] = useState('2');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (initialProgram && PROGRAM_NAMES.includes(initialProgram)) setProgram(initialProgram);
  }, [initialProgram]);

  useImperativeHandle(ref, () => ({
    prefill(p: string) {
      if (PROGRAM_NAMES.includes(p)) setProgram(p);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 500);
    },
  }));

  const n = name.trim();
  const ph = phone.trim();
  const ok = n.length > 1 && ph.replace(/\D/g, '').length >= 10;
  const message = 'السلام عليكم، أريد عرض سعر من برومس للسياحة\n'
    + `الاسم: ${n || '-'}\nالموبايل: ${ph || '-'}\nالبرنامج: ${program}`
    + `\nعدد الأفراد: ${count || '-'}\nالموعد: ${when.trim() || '-'}`
    + (note.trim() ? `\nملاحظات: ${note.trim()}` : '');

  return (
    <section id={id} ref={sectionRef} className="pm-section tint" style={{ scrollMarginTop: 'var(--nav-h)' }}>
      <div className="pm-wrap">
        {!hideHead && <SectionHead kicker="تواصل معنا" title="اطلب عرض سعر" text="املأ البيانات وسيفتح واتساب برسالة جاهزة لفريق المبيعات." />}
        <div className="pm-contact-grid">
          <form className="pm-panel" noValidate onSubmit={(e) => e.preventDefault()}>
            <h3>نموذج الاستفسار</h3>
            <p className="pm-panel-lead">نرد عليك في أقرب وقت خلال مواعيد العمل.</p>
            <div className="pm-fields">
              <div className="pm-field"><label htmlFor={`${id}-name`}>الاسم</label><input id={`${id}-name`} ref={nameRef} autoComplete="name" placeholder="مثال: محمد أحمد" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="pm-field"><label htmlFor={`${id}-phone`}>رقم الموبايل</label><input id={`${id}-phone`} inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" dir="ltr" style={{ textAlign: 'right' }} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="pm-field"><label htmlFor={`${id}-program`}>البرنامج</label>
                <select id={`${id}-program`} value={program} onChange={(e) => setProgram(e.target.value)}>{PROGRAM_NAMES.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <div className="pm-field"><label htmlFor={`${id}-count`}>عدد الأفراد</label><input id={`${id}-count`} type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} /></div>
              <div className="pm-field full"><label htmlFor={`${id}-when`}>الموعد المفضل</label><input id={`${id}-when`} placeholder="مثال: نصف العام، رمضان، أو تاريخ محدد" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
              <div className="pm-field full"><label htmlFor={`${id}-note`}>ملاحظات</label><textarea id={`${id}-note`} placeholder="مستوى الفندق، غرفة ثنائية أو ثلاثية، أي طلب خاص" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>
            <div className="pm-form-foot">
              <a className="pm-btn pm-btn-teal" href={waLink(message)} target="_blank" rel="noopener noreferrer" aria-disabled={ok ? 'false' : 'true'}>إرسال عبر واتساب</a>
              <small>{ok ? 'سيفتح واتساب برسالتك جاهزة للإرسال.' : 'اكتب الاسم ورقم الموبايل لتفعيل الإرسال.'}</small>
            </div>
            {onBooking && (
              <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--muted)' }}>
                تفضّل نموذج الحجز الكامل مع رفع المستندات؟{' '}
                <button type="button" className="pm-link" style={{ fontSize: 14 }} onClick={onBooking}>افتح نموذج الحجز</button>
              </p>
            )}
          </form>
          <ContactInfoPanel onCopied={toast.say} />
        </div>
      </div>
      {toast.node}
    </section>
  );
});

export default QuoteContact;
