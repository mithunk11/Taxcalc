import TaxCalcApp from '@/components/TaxCalcApp';
import InfoPage, { Checklist } from '@/components/InfoPage';
import { engines } from '@/lib/tax/engines';

function Privacy() {
  return <InfoPage eyebrow="Privacy by design" title="Your salary is nobody else’s business." intro="TaxCalc is intentionally account-free and database-free. The core calculator runs entirely in your browser."><h2>What TaxCalc does not collect</h2><Checklist items={['Salary or desired net pay', 'Tax code, marital status or partner income', 'Pension, student-loan or deduction details', 'Payslips or financial documents']} /><h2>Harmless preferences</h2><p>TaxCalc may remember non-sensitive interface preferences on your device. Financial inputs are not automatically saved.</p><h2>Exports and sharing</h2><p>Copied summaries and downloaded files are created locally. TaxCalc does not put salary values into public URLs.</p></InfoPage>;
}

function Methodology() {
  return <InfoPage eyebrow="Transparent calculations" title="How TaxCalc turns gross pay into take-home pay." intro="Each supported country has a separate, versioned engine. TaxCalc never uses a generic European formula or silently borrows rules from another country."><h2>Gross to net</h2><p>The engine applies country-specific taxable-pay treatment, progressive tax slices, credits or allowances, statutory social contributions, supported pension treatment and user-entered deductions. Money is handled in integer minor units.</p><h2>Net to gross</h2><p>TaxCalc uses a bounded binary-search solver. It repeatedly runs the complete gross-to-net engine until the calculated net matches the target within one minor unit.</p><h2>Maintenance workflow</h2><Checklist items={['Check official government documentation', 'Update versioned parameters and effective dates', 'Run boundary and reverse-calculation tests', 'Record source URLs and verification dates']} /><h2>Known limits</h2><p>The core engines model standard employment income, not self-employment, multiple jobs, foreign tax credits, complex share awards, non-resident taxation, capital gains or rental income.</p></InfoPage>;
}

function Sources() {
  return <InfoPage eyebrow="Official-source registry" title="Tax rules you can inspect." intro="Every enabled engine is tied to a tax year, an engine version and primary government material. Rates are never auto-scraped into production."><div className="source-registry">{Object.values(engines).map((engine) => <section key={engine.code}><div><span>{engine.code === 'IE' ? '🇮🇪' : engine.code === 'UK' ? '🇬🇧' : '🇮🇳'}</span><h2>{engine.country}<small>{engine.taxYear} · Engine {engine.engineVersion} · Verified {engine.lastVerified}</small></h2></div>{engine.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.authority}</span><b>{source.title}</b></a>)}</section>)}</div><h2>Rule expiry safety</h2><p>TaxCalc only labels the years shown above as supported. Future rules are not presented as current until officially published, implemented and tested.</p></InfoPage>;
}

function About() {
  return <InfoPage eyebrow="An MJ Apps tool" title="A clearer way to understand your pay." intro="TaxCalc answers two ordinary but surprisingly difficult questions: what will land in my bank, and what salary do I need to ask for?"><h2>Built for understanding</h2><p>Every deduction has an explanation, every assumption is visible, and progressive rates are shown as slices.</p><h2>Accuracy before country count</h2><p>Ireland, the United Kingdom and India each use an independent engine.</p></InfoPage>;
}

export default function VercelRouter() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/privacy') return <Privacy />;
  if (path === '/methodology') return <Methodology />;
  if (path === '/tax-sources') return <Sources />;
  if (path === '/about') return <About />;
  if (path.includes('india-')) return <TaxCalcApp initialCountry="IN" />;
  if (path.includes('uk-')) return <TaxCalcApp initialCountry="UK" />;
  if (path.includes('ireland-')) return <TaxCalcApp initialCountry="IE" />;
  if (path === '/net-to-gross') return <TaxCalcApp initialMode="net" />;
  return <TaxCalcApp />;
}
