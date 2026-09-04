import { ArrowLeft, BadgeCheck, Check, LockKeyhole } from 'lucide-react';

export default function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="info-shell">
      <header className="info-header"><a className="brand" href="/"><img src="/brand/taxcalc-logo.png" alt="" /><span>Tax<span>Calc</span></span></a><a href="/"><ArrowLeft /> Back to calculator</a></header>
      <article className="info-article"><div className="eyebrow"><BadgeCheck /> {eyebrow}</div><h1>{title}</h1><p className="info-intro">{intro}</p>{children}</article>
      <section className="info-cta"><LockKeyhole /><div><b>Ready to understand your pay?</b><span>Your calculation stays in this browser.</span></div><a href="/">Open TaxCalc</a></section>
      <footer className="info-footer"><span>© 2026 TaxCalc · An MJ Apps tool</span><nav><a href="/privacy">Privacy</a><a href="/methodology">Methodology</a><a href="/tax-sources">Sources</a></nav></footer>
    </main>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return <div className="info-checklist">{items.map((item) => <span key={item}><Check /> {item}</span>)}</div>;
}
