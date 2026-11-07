import type { ReactNode } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PublicPage } from '../WebsiteRouter';
import { FAQS, PROGRAMS, SITE, STEPS, VOWS } from './siteData';
import { ProgramIcon } from './icons';

export type NavFn = (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;

export interface Crumb { label: string; page?: PublicPage }

export function Crumbs({ items, onNavigate }: { items: Crumb[]; onNavigate: NavFn }) {
  return (
    <nav className="pm-crumbs" aria-label="مسار الصفحة">
      {items.map((c, i) => (
        <span key={c.label} className="contents">
          {i > 0 && <span className="sep" aria-hidden="true">/</span>}
          {c.page ? <button type="button" onClick={() => onNavigate(c.page!)}>{c.label}</button> : <span aria-current="page">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({ eyebrow, title, lead, crumbs, onNavigate, children, after }: {
  eyebrow?: string; title: ReactNode; lead?: ReactNode; crumbs?: Crumb[]; onNavigate: NavFn; children?: ReactNode;
  /** Rendered below the hero content, full width (e.g. a trust bar). */
  after?: ReactNode;
}) {
  return (
    <div className="pm-page-hero pm-pattern">
      <div className="pm-wrap">
        {crumbs && <Crumbs items={crumbs} onNavigate={onNavigate} />}
        {eyebrow && <span className="pm-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p className="pm-lead">{lead}</p>}
        {children}
      </div>
      {after}
    </div>
  );
}

export function TrustBar({ items }: { items: { title: ReactNode; text: string }[] }) {
  return (
    <div className="pm-trust">
      <div className="pm-wrap">
        {items.map((f, i) => <div key={i} className="pm-trust-item"><b>{f.title}</b><span>{f.text}</span></div>)}
      </div>
    </div>
  );
}

export function SectionHead({ kicker, title, text, action }: { kicker?: string; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="pm-sec-head">
      <div>{kicker && <span className="pm-kicker">{kicker}</span>}<h2>{title}</h2></div>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ViewAll({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="pm-link" onClick={onClick}>{label} <ArrowLeft size={15} aria-hidden="true" /></button>;
}

export function Loading() {
  return <div className="pm-loading" role="status" aria-label="جارٍ التحميل"><Loader2 size={30} className="animate-spin" /></div>;
}

export function Empty({ icon, title, text }: { icon?: ReactNode; title: string; text?: string }) {
  return (
    <div className="pm-empty">
      {icon}
      <p style={{ fontWeight: 600 }}>{title}</p>
      {text && <p style={{ fontSize: 14, marginTop: 4 }}>{text}</p>}
    </div>
  );
}

/** The five service cards. `onQuote` receives the program name to prefill the quote form. */
export function ProgramsGrid({ onQuote, onNavigate }: { onQuote: (program: string) => void; onNavigate: NavFn }) {
  return (
    <div className="pm-programs">
      {PROGRAMS.map((p, i) => (
        <article key={p.key} className={`pm-prog${p.feature ? ' feature' : ''}${i === PROGRAMS.length - 1 ? ' last' : ''}`}>
          <span className="pm-ico"><ProgramIcon name={p.key} /></span>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
          {p.bullets && <ul className="pm-bullets">{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          <div className="pm-prog-actions">
            <button type="button" className="pm-link" onClick={() => onQuote(p.title)}>{p.cta} ←</button>
            {p.page && <button type="button" className="pm-link subtle" onClick={() => onNavigate(p.page!)}>{p.pageLabel}</button>}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PromiseSection({ id }: { id?: string }) {
  return (
    <section id={id} className="pm-section pm-pattern pm-on-teal">
      <div className="pm-wrap">
        <SectionHead kicker="لماذا برومس" title="اسمنا وعد، وده التزامنا معاك" text="أربعة أشياء نلتزم بها مع كل عميل، من أول استفسار لحد ما ترجع بالسلامة." />
        <div className="pm-vows">
          {VOWS.map((v) => <div key={v.title} className="pm-vow"><b>{v.title}</b><p>{v.text}</p></div>)}
        </div>
        <div className="pm-quote-ref">
          <code>PR-U-2611-014-MH</code>
          <p>كل عرض سعر عندنا له رقم مرجعي يوضح البرنامج والتاريخ والموظف المسؤول. احتفظ به، وبه تتابع حجزك معنا في أي وقت.</p>
        </div>
      </div>
    </section>
  );
}

export function StepsSection({ id }: { id?: string }) {
  return (
    <section id={id} className="pm-section">
      <div className="pm-wrap">
        <SectionHead kicker="خطوات الحجز" title="من الاستفسار للسفر" />
        <ol className="pm-steps">
          {STEPS.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}
        </ol>
      </div>
    </section>
  );
}

/** `flush` drops the top padding when FAQ directly follows another paper section (as in the design). */
export function FaqSection({ id, flush = true }: { id?: string; flush?: boolean }) {
  return (
    <section id={id} className="pm-section" style={flush ? { paddingTop: 0 } : undefined}>
      <div className="pm-wrap pm-faq-wrap">
        <div className="pm-sec-head" style={{ margin: 0 }}><div><span className="pm-kicker">أسئلة شائعة</span><h2>قبل ما تحجز</h2></div></div>
        <div className="pm-faq">
          {FAQS.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </div>
    </section>
  );
}

export function LicenseNum() {
  return <span className="pm-num">{SITE.license}</span>;
}
