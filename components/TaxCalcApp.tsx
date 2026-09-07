'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calculator,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  LockKeyhole,
  Menu,
  Printer,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { engines } from '@/lib/tax/engines';
import { major, solveGross, toMajor } from '@/lib/tax/money';
import type { CountryCode, IndiaRegime, StudentLoanPlan, UkRegion } from '@/lib/tax/types';

type Mode = 'gross' | 'net';
type InputPeriod = 'annual' | 'monthly' | 'weekly' | 'hourly';
type ResultPeriod = 'annual' | 'monthly' | 'weekly' | 'day';
type ResultTab = 'overview' | 'tax' | 'bands' | 'assumptions';

const countryMeta: Record<CountryCode, { flag: string; short: string; defaultSalary: number; tagline: string }> = {
  IE: { flag: '🇮🇪', short: 'Ireland', defaultSalary: 60000, tagline: 'PAYE · USC · PRSI' },
  UK: { flag: '🇬🇧', short: 'United Kingdom', defaultSalary: 55000, tagline: 'Income Tax · NI' },
  IN: { flag: '🇮🇳', short: 'India', defaultSalary: 1800000, tagline: 'New / Old regime · PF' },
};

const periodMultipliers: Record<InputPeriod, number> = { annual: 1, monthly: 12, weekly: 52, hourly: 0 };
const resultDivisors: Record<ResultPeriod, number> = { annual: 1, monthly: 12, weekly: 52, day: 260 };

function safeNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function download(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FieldSelect({ value, onValueChange, children, label }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode; label: string }) {
  return (
    <Select value={value} onValueChange={(next) => next && onValueChange(String(next))}>
      <SelectTrigger aria-label={label} className="field-select"><SelectValue /></SelectTrigger>
      <SelectContent className="select-menu">{children}</SelectContent>
    </Select>
  );
}

export default function TaxCalcApp({ initialCountry = 'IE', initialMode = 'gross' }: { initialCountry?: CountryCode; initialMode?: Mode }) {
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [inputPeriod, setInputPeriod] = useState<InputPeriod>('annual');
  const [resultPeriod, setResultPeriod] = useState<ResultPeriod>('annual');
  const [value, setValue] = useState(countryMeta[initialCountry].defaultSalary);
  const [hours, setHours] = useState(37.5);
  const [weeks, setWeeks] = useState(52);
  const [bonus, setBonus] = useState(0);
  const [pension, setPension] = useState(0);
  const [other, setOther] = useState(0);
  const [status, setStatus] = useState<'single' | 'married-one-income'>('single');
  const [ukRegion, setUkRegion] = useState<UkRegion>('england');
  const [studentLoan, setStudentLoan] = useState<StudentLoanPlan>('none');
  const [indiaRegime, setIndiaRegime] = useState<IndiaRegime>('new');
  const [detailed, setDetailed] = useState(false);
  const [tab, setTab] = useState<ResultTab>('overview');
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [raiseSalary, setRaiseSalary] = useState(countryMeta[initialCountry].defaultSalary * 1.1);
  const flowRef = useRef<HTMLDivElement>(null);

  const engine = engines[country];
  const annualInput = inputPeriod === 'hourly' ? value * hours * weeks : value * periodMultipliers[inputPeriod];
  const baseInput = useMemo(() => ({
    bonus: major(bonus), pensionBps: Math.round(pension * 100), status, ukRegion, studentLoan, indiaRegime, otherDeduction: major(other),
  }), [bonus, pension, status, ukRegion, studentLoan, indiaRegime, other]);

  const result = useMemo(() => {
    const annualMinor = major(annualInput);
    if (mode === 'gross') return engine.calculate({ ...baseInput, gross: annualMinor });
    const solved = solveGross(annualMinor, (gross) => engine.calculate({ ...baseInput, bonus: 0, gross }).net);
    return engine.calculate({ ...baseInput, bonus: 0, gross: solved });
  }, [annualInput, mode, engine, baseInput]);

  const displayDivider = resultDivisors[resultPeriod];
  const displayValue = mode === 'gross' ? result.net / displayDivider : result.gross / displayDivider;
  const inputCurrency = engine.currency;
  const formatMinor = (minor: number, digits = 0) => new Intl.NumberFormat(engine.locale, { style: 'currency', currency: inputCurrency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(toMajor(minor));
  const formatMajor = (amount: number, digits = 0) => new Intl.NumberFormat(engine.locale, { style: 'currency', currency: inputCurrency, maximumFractionDigits: digits }).format(amount);
  const keep = result.gross > 0 ? Math.max(0, (result.net / result.gross) * 100) : 100;
  const effectiveTax = result.gross > 0 ? (result.incomeTax / result.gross) * 100 : 0;
  const deductionRate = result.gross > 0 ? ((result.gross - result.net) / result.gross) * 100 : 0;

  const salaryMax = country === 'IN' ? 10000000 : 250000;
  const periodLabel = resultPeriod === 'day' ? 'working day' : resultPeriod;

  const selectCountry = (next: CountryCode) => {
    setCountry(next);
    setValue(countryMeta[next].defaultSalary);
    setRaiseSalary(countryMeta[next].defaultSalary * 1.1);
    setBonus(0); setOther(0); setPension(0); setInputPeriod('annual');
  };

  const summary = `${engine.country} — ${engine.taxYear}\n${mode === 'gross' ? 'Gross salary' : 'Required gross'}: ${formatMinor(result.gross)} / year\nEstimated take-home: ${formatMinor(result.net)} / year (${formatMinor(result.net / 12, 2)} / month)\nIncome tax: ${formatMinor(result.incomeTax)}\nSocial contributions: ${formatMinor(result.social)}\nEstimate only — not an official payslip, tax assessment or financial advice.`;

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const exportCsv = () => {
    const rows = [['TaxCalc salary estimate', engine.country, engine.taxYear], ['Gross', toMajor(result.gross)], ...result.items.map((item) => [item.label, toMajor(item.amount)]), ['Take home', toMajor(result.net)]];
    download(`taxcalc-${country.toLowerCase()}-${engine.taxYear.replace(/\W/g, '-')}.csv`, 'text/csv', rows.map((row) => row.join(',')).join('\n'));
  };

  const exportJson = () => download(`taxcalc-${country.toLowerCase()}.json`, 'application/json', JSON.stringify({ generatedLocally: true, country: engine.country, taxYear: engine.taxYear, result: { ...result, gross: toMajor(result.gross), taxable: toMajor(result.taxable), incomeTax: toMajor(result.incomeTax), social: toMajor(result.social), pension: toMajor(result.pension), other: toMajor(result.other), net: toMajor(result.net) }, disclaimer: 'Estimate only. Not an official payslip, tax assessment or financial advice.' }, null, 2));

  const raiseResult = useMemo(() => engine.calculate({ ...baseInput, bonus: 0, gross: major(raiseSalary) }), [engine, baseInput, raiseSalary]);
  const grossRaise = Math.max(0, raiseResult.gross - result.gross);
  const netRaise = Math.max(0, raiseResult.net - result.net);

  useEffect(() => {
    const node = flowRef.current;
    if (!node) return;
    const move = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      node.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
      node.style.setProperty('--tilt-y', `${(x * 6).toFixed(2)}deg`);
    };
    const leave = () => { node.style.setProperty('--tilt-x', '0deg'); node.style.setProperty('--tilt-y', '0deg'); };
    node.addEventListener('pointermove', move); node.addEventListener('pointerleave', leave);
    return () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave); };
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'calculate_salary', title: 'Calculate salary',
      description: 'Calculate a gross-to-net annual salary estimate and update the visible TaxCalc workspace.',
      inputSchema: { type: 'object', properties: { country: { type: 'string', enum: ['IE', 'UK', 'IN'] }, gross: { type: 'number', minimum: 0 } }, required: ['country', 'gross'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const candidate = input as { country?: CountryCode; gross?: number };
        if (!candidate || !['IE', 'UK', 'IN'].includes(String(candidate.country)) || !Number.isFinite(candidate.gross) || Number(candidate.gross) < 0) throw new Error('country must be IE, UK or IN and gross must be a non-negative number');
        const nextCountry = candidate.country as CountryCode;
        const nextGross = Number(candidate.gross);
        selectCountry(nextCountry); setMode('gross'); setInputPeriod('annual'); setValue(nextGross);
        const calculated = engines[nextCountry].calculate({ gross: major(nextGross), status: 'single', ukRegion: 'england', studentLoan: 'none', indiaRegime: 'new' });
        return { country: nextCountry, taxYear: engines[nextCountry].taxYear, gross: toMajor(calculated.gross), net: toMajor(calculated.net), incomeTax: toMajor(calculated.incomeTax), socialContributions: toMajor(calculated.social) };
      },
    };
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Unsupported preview context. */ }
    return () => lifecycle.abort();
  }, []);

  return (
    <main className={`site-shell country-${country.toLowerCase()}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="TaxCalc home"><img src="/brand/taxcalc-logo.png" alt="" /><span>Tax<span>Calc</span></span></a>
        <nav className={mobileNav ? 'nav-links open' : 'nav-links'} aria-label="Primary navigation">
          <a href="#calculator">Calculator</a><a href="#how-it-works">How it works</a><a href="/tax-sources">Tax sources</a><a href="/methodology">Methodology</a>
        </nav>
        <div className="header-actions">
          <button className="privacy-button"><LockKeyhole size={16} /> <span>Private by design</span></button>
          <button className="menu-button" onClick={() => setMobileNav(!mobileNav)} aria-expanded={mobileNav} aria-label="Toggle menu">{mobileNav ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="intro">
        <div className="eyebrow"><Sparkles size={14} /> Salary, clearly explained</div>
        <h1>Know what actually<br />lands in your bank.</h1>
        <p>Gross. Tax. Deductions. Take-home — transparent, private and calculated locally.</p>
        <div className="trust-row"><span><Check /> No account</span><span><Check /> No salary storage</span><span><Check /> Official rules</span></div>
      </section>

      <section id="calculator" className="workspace" aria-label="Salary calculator">
        <div className="setup-card panel">
          <div className="mode-switch" role="tablist" aria-label="Calculation direction">
            <button role="tab" aria-selected={mode === 'gross'} className={mode === 'gross' ? 'active' : ''} onClick={() => setMode('gross')}>Gross <span>→</span> Take home</button>
            <button role="tab" aria-selected={mode === 'net'} className={mode === 'net' ? 'active' : ''} onClick={() => setMode('net')}>Take home <span>→</span> Gross</button>
          </div>

          <div className="field-label"><span>Country & tax year</span><Dialog><DialogTrigger className="source-inline"><BadgeCheck size={13} /> Verified</DialogTrigger><DialogContent className="sources-dialog"><DialogHeader><DialogTitle>{engine.country} · {engine.taxYear}</DialogTitle><DialogDescription>Engine {engine.engineVersion}, last checked against official sources on {engine.lastVerified}.</DialogDescription></DialogHeader>{engine.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.authority}</span><b>{source.title}</b><ChevronRight /></a>)}</DialogContent></Dialog></div>
          <Select value={country} onValueChange={(next) => next && selectCountry(next as CountryCode)}>
            <SelectTrigger className="country-select" aria-label="Country"><SelectValue>{countryMeta[country].flag}<span><b>{countryMeta[country].short}</b><small>{engine.taxYear} · Supported</small></span></SelectValue></SelectTrigger>
            <SelectContent className="country-menu">
              {(Object.keys(countryMeta) as CountryCode[]).map((code) => <SelectItem key={code} value={code}><span className="flag">{countryMeta[code].flag}</span><span><b>{countryMeta[code].short}</b><small>{engines[code].taxYear} · {countryMeta[code].tagline}</small></span></SelectItem>)}
            </SelectContent>
          </Select>

          <div className="salary-meta">
            <div className="field-label salary-label"><span>{mode === 'gross' ? 'Your salary' : 'I want to take home'}</span></div>
            <FieldSelect label="Salary period" value={inputPeriod} onValueChange={(next) => setInputPeriod(next as InputPeriod)}>
              <SelectItem value="annual">Per year</SelectItem><SelectItem value="monthly">Per month</SelectItem><SelectItem value="weekly">Per week</SelectItem><SelectItem value="hourly">Per hour</SelectItem>
            </FieldSelect>
          </div>
          <div className="salary-input"><span>{new Intl.NumberFormat(engine.locale, { style: 'currency', currency: engine.currency }).formatToParts(0).find((part) => part.type === 'currency')?.value}</span><input aria-label={mode === 'gross' ? 'Salary amount' : 'Desired take-home amount'} inputMode="decimal" value={value} onChange={(event) => setValue(safeNumber(event.target.value))} /></div>
          {inputPeriod === 'hourly' && <div className="hourly-grid"><label>Hours / week<input type="number" min="1" max="100" value={hours} onChange={(e) => setHours(safeNumber(e.target.value))} /></label><label>Weeks / year<input type="number" min="1" max="53" value={weeks} onChange={(e) => setWeeks(safeNumber(e.target.value))} /></label></div>}
          <input className="salary-slider" style={{ '--slider-fill': `${Math.min(100, (annualInput / salaryMax) * 100)}%` } as React.CSSProperties} aria-label="Salary slider" type="range" min="0" max={salaryMax} step={country === 'IN' ? 10000 : 500} value={Math.min(annualInput, salaryMax)} onChange={(event) => { setInputPeriod('annual'); setValue(Number(event.target.value)); }} />
          <div className="range-labels"><span>{formatMajor(0)}</span><span>{formatMajor(salaryMax)}</span></div>

          <div className="quick-row"><button className={!detailed ? 'active' : ''} onClick={() => setDetailed(false)}>Quick estimate</button><button className={detailed ? 'active' : ''} onClick={() => setDetailed(true)}>Improve accuracy <ChevronRight size={13} /></button></div>

          <div className={detailed ? 'advanced-fields open' : 'advanced-fields'}>
            {country === 'IE' && <label><span>Personal status <Info size={12} /></span><FieldSelect label="Personal status" value={status} onValueChange={(next) => setStatus(next as typeof status)}><SelectItem value="single">Single</SelectItem><SelectItem value="married-one-income">Married · one income</SelectItem></FieldSelect></label>}
            {country === 'UK' && <><label><span>Where are you taxed?</span><FieldSelect label="UK tax region" value={ukRegion} onValueChange={(next) => setUkRegion(next as UkRegion)}><SelectItem value="england">England</SelectItem><SelectItem value="scotland">Scotland</SelectItem><SelectItem value="wales">Wales</SelectItem><SelectItem value="northern-ireland">Northern Ireland</SelectItem></FieldSelect></label><label><span>Student loan</span><FieldSelect label="Student loan" value={studentLoan} onValueChange={(next) => setStudentLoan(next as StudentLoanPlan)}><SelectItem value="none">None / not included</SelectItem><SelectItem value="plan1">Plan 1</SelectItem><SelectItem value="plan2">Plan 2</SelectItem><SelectItem value="plan4">Plan 4</SelectItem><SelectItem value="plan5">Plan 5</SelectItem><SelectItem value="postgraduate">Postgraduate</SelectItem></FieldSelect></label></>}
            {country === 'IN' && <label><span>Tax regime</span><FieldSelect label="India tax regime" value={indiaRegime} onValueChange={(next) => setIndiaRegime(next as IndiaRegime)}><SelectItem value="new">New Regime (default)</SelectItem><SelectItem value="old">Old Regime</SelectItem></FieldSelect></label>}
            <label><span>{country === 'IN' ? 'Actual PF / retirement contribution' : country === 'UK' ? 'Salary sacrifice pension' : 'Pension contribution'} <b>{pension.toFixed(0)}%</b></span><input type="range" min="0" max={country === 'IE' ? 15 : country === 'IN' ? 12 : 20} step="1" value={pension} onChange={(e) => setPension(Number(e.target.value))} /></label>
            <div className="split-fields"><label><span>Annual bonus</span><div><i>{formatMajor(0).replace(/[\d\s.,]/g, '')}</i><input inputMode="decimal" value={bonus} onChange={(e) => setBonus(safeNumber(e.target.value))} /></div></label><label><span>Other deductions / year</span><div><i>{formatMajor(0).replace(/[\d\s.,]/g, '')}</i><input inputMode="decimal" value={other} onChange={(e) => setOther(safeNumber(e.target.value))} /></div></label></div>
          </div>
          {!detailed && <div className="assumption-note">{result.assumptions.slice(0, 3).map((assumption) => <span key={assumption}><Check /> {assumption}</span>)}</div>}
        </div>

        <div ref={flowRef} className="flow-card panel" key={`${country}-${mode}`} aria-label="Salary flow visualisation">
          <div className="flow-head"><span>Where your salary goes</span><small>Annual estimate</small></div>
          <div className="money-stage">
            <div className="ambient-orb orb-one"></div><div className="ambient-orb orb-two"></div>
            <div className="payslip-3d" aria-hidden="true"><div className="payslip-top"><span></span><span></span></div><div className="payslip-row"><span></span><b></b></div><div className="payslip-row"><span></span><b></b></div><div className="payslip-row"><span></span><b></b></div><div className="payslip-total"><span></span><b></b></div></div>
            <div className="money-stack">
              <div className="salary-block gross-block"><small>{mode === 'gross' ? 'GROSS SALARY' : 'REQUIRED GROSS'}</small><strong>{formatMinor(result.gross)}</strong><span>{bonus > 0 ? `Includes ${formatMajor(bonus)} bonus` : 'Your full annual pay'}</span></div>
              <div className="flow-rail"><ArrowDown size={18} /><i></i></div>
              <div className="deduction-layer tax-layer"><span>{result.items.find((item) => item.kind === 'tax')?.label ?? 'Income Tax'}</span><b>− {formatMinor(result.incomeTax)}</b></div>
              {result.social > 0 && <div className="deduction-layer social-layer"><span>{country === 'IE' ? 'USC + PRSI' : country === 'UK' ? 'NI + loans' : 'Retirement / PF'}</span><b>− {formatMinor(result.social)}</b></div>}
              {result.pension > 0 && country !== 'IN' && <div className="deduction-layer pension-layer"><span>Pension</span><b>− {formatMinor(result.pension)}</b></div>}
              {result.other > 0 && <div className="deduction-layer other-layer"><span>Other</span><b>− {formatMinor(result.other)}</b></div>}
              <div className="flow-rail short"><ArrowDown size={18} /></div>
              <div className="salary-block net-block"><small>{country === 'IN' ? 'IN-HAND SALARY' : 'TAKE-HOME PAY'}</small><strong>{formatMinor(result.net)}</strong><span>{formatMinor(result.net / 12, 2)} per month</span></div>
            </div>
          </div>
          <div className="flow-caption"><BadgeCheck size={14} /> Calculated locally with {engine.country} {engine.taxYear} rules</div>
        </div>

        <div className="result-card panel">
          <div className="result-top"><span>{mode === 'gross' ? (country === 'IN' ? 'ESTIMATED IN-HAND' : 'ESTIMATED TAKE HOME') : 'ESTIMATED REQUIRED GROSS'}</span><div>{(['annual', 'monthly', 'weekly'] as ResultPeriod[]).map((period) => <button key={period} className={resultPeriod === period ? 'active' : ''} onClick={() => setResultPeriod(period)}>{period[0].toUpperCase() + period.slice(1)}</button>)}</div></div>
          <strong className="hero-number" aria-live="polite">{formatMinor(displayValue, resultPeriod === 'annual' ? 0 : 2)}</strong>
          <p className="per-month">per {periodLabel} <span>· {formatMinor((mode === 'gross' ? result.net : result.gross) / 12, 2)} monthly</span></p>

          <div className="keep-overview"><div className="keep-ring" style={{ '--keep': `${keep * 3.6}deg` } as React.CSSProperties}><div><strong>{keep.toFixed(0)}%</strong><span>you keep</span></div></div><div className="rate-stats"><div><span>Effective income tax</span><b>{effectiveTax.toFixed(1)}%</b></div><div><span>Total deduction rate</span><b>{deductionRate.toFixed(1)}%</b></div><div><span>Marginal deduction</span><b>≈ {(result.marginalRateBps / 100).toFixed(1)}%</b></div></div></div>

          <div className="result-tabs" role="tablist">{(['overview', 'tax', 'bands', 'assumptions'] as ResultTab[]).map((item) => <button role="tab" aria-selected={tab === item} key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'bands' ? 'Tax bands' : item[0].toUpperCase() + item.slice(1)}</button>)}</div>
          <div className="tab-panel" key={tab}>
            {tab === 'overview' && <div className="breakdown"><div><span><i className="dot gross"></i>Gross</span><b>{formatMinor(result.gross)}</b></div>{result.items.map((item) => <div key={item.id}><span><i className={`dot ${item.kind}`}></i>{item.label}</span><b>− {formatMinor(item.amount)}</b></div>)}<div className="net-row"><span><i className="dot net"></i>{country === 'IN' ? 'In-hand salary' : 'Take home'}</span><b>{formatMinor(result.net)}</b></div></div>}
            {tab === 'tax' && <div className="explain-list">{result.items.map((item) => <div key={item.id}><span className={`explain-icon ${item.kind}`}><ReceiptText /></span><p><b>{item.label} · {formatMinor(item.amount)}</b><small>{item.explanation}</small></p></div>)}</div>}
            {tab === 'bands' && <BandVisual country={country} salary={toMajor(result.taxable)} currency={engine.currency} locale={engine.locale} />}
            {tab === 'assumptions' && <div className="assumptions-list">{result.assumptions.map((assumption) => <div key={assumption}><Check /> {assumption}</div>)}<p><CircleHelp /> Unknown or unentered deductions are not guessed.</p></div>}
          </div>

          <div className="result-actions">
            <button onClick={copySummary}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy summary'}</button>
            <Dialog><DialogTrigger><Download /> Export</DialogTrigger><DialogContent className="export-dialog"><DialogHeader><DialogTitle>Export your estimate</DialogTitle><DialogDescription>Generated locally. Salary values are never added to a public URL.</DialogDescription></DialogHeader><button onClick={() => window.print()}><Printer /> Print / save PDF <span>Polished browser report</span></button><button onClick={exportCsv}><FileSpreadsheet /> Download CSV <span>Rows for your spreadsheet</span></button><button onClick={exportJson}><FileJson /> Download JSON <span>Structured calculation data</span></button></DialogContent></Dialog>
          </div>
        </div>
      </section>

      <section className="tool-row" aria-label="Related salary tools">
        <Dialog>
          <DialogTrigger className="tool-card"><span className="tool-icon coral"><TrendingUp /></span><span><small>SALARY INCREASE</small><b>What if I get a raise?</b><p>See how much of your raise reaches your bank.</p></span><ArrowRight /></DialogTrigger>
          <DialogContent className="raise-dialog"><DialogHeader><DialogTitle>What if I get a raise?</DialogTitle><DialogDescription>Compare take-home using the same {engine.country} assumptions.</DialogDescription></DialogHeader><label>New annual gross<input type="number" value={raiseSalary} onChange={(e) => setRaiseSalary(safeNumber(e.target.value))} /></label><div className="raise-results"><div><span>Gross increase</span><b>{formatMinor(grossRaise)}</b></div><div><span>Take-home increase</span><b>{formatMinor(netRaise)}</b></div><div><span>Monthly difference</span><b>{formatMinor(netRaise / 12, 2)}</b></div><div><span>Amount retained</span><b>{grossRaise > 0 ? ((netRaise / grossRaise) * 100).toFixed(0) : 0}%</b></div></div></DialogContent>
        </Dialog>
        <button className="tool-card" onClick={() => { setDetailed(true); document.getElementById('calculator')?.scrollIntoView(); }}><span className="tool-icon blue"><Calculator /></span><span><small>VARIABLE PAY</small><b>Add bonus & deductions</b><p>Model a bonus, pension and other payroll items.</p></span><ArrowRight /></button>
        <Dialog><DialogTrigger className="tool-card"><span className="tool-icon violet"><ShieldCheck /></span><span><small>ASSUMPTIONS</small><b>What am I missing?</b><p>Check the details that can change your payslip.</p></span><ArrowRight /></DialogTrigger><DialogContent className="check-dialog"><DialogHeader><DialogTitle>Could anything else come off your pay?</DialogTitle><DialogDescription>TaxCalc never guesses unknown deductions. Check these against your payslip or tax certificate.</DialogDescription></DialogHeader>{(country === 'IE' ? ['Revenue tax credits and rate band', 'Pension contribution type and age limits', 'Taxable workplace benefits', 'PRSI class other than A'] : country === 'UK' ? ['Tax code or custom allowance', 'Student or postgraduate loan', 'Pension arrangement type', 'Benefits and payroll deductions'] : ['Salary structure versus CTC', 'Actual employee PF', 'State professional tax', 'Eligible Old Regime deductions']).map((item) => <div className="check-item" key={item}><span><Check /></span>{item}</div>)}</DialogContent></Dialog>
      </section>

      <section id="how-it-works" className="explain-section">
        <div><div className="eyebrow"><BarChart3 size={14} /> Progressive tax, made visible</div><h2>Your higher rate never applies to everything.</h2><p>TaxCalc treats your salary as slices. Each slice is calculated at its own official rate, then credits, contributions and deductions are applied in the right order for the selected country.</p><a href="/methodology">Explore the methodology <ArrowRight /></a></div>
        <BandVisual country={country} salary={toMajor(result.taxable)} currency={engine.currency} locale={engine.locale} large />
      </section>

      <section className="privacy-section"><div className="privacy-lock"><LockKeyhole /></div><div><small>PRIVATE BY DEFAULT</small><h2>Your salary stays with you.</h2><p>No account. No payslip upload. No database. No AI. Tax rules ship with TaxCalc and every calculation happens in this browser.</p></div><div className="privacy-grid"><span><Check /> Salary not stored</span><span><Check /> No personal analytics</span><span><Check /> No public result URL</span><span><Check /> Local exports</span></div></section>

      <footer><a className="brand footer-brand" href="/"><img src="/brand/taxcalc-logo.png" alt="" /><span>Tax<span>Calc</span></span></a><p>Understand your pay. Keep your privacy.</p><nav><a href="/privacy">Privacy</a><a href="/methodology">Methodology</a><a href="/tax-sources">Tax sources</a><span>A Techvora product</span></nav><div className="disclaimer">TaxCalc provides an estimate based on the information and tax rules selected. It is not tax, payroll or financial advice. Actual payslips can differ because of tax certificates, payroll timing, previous earnings, cumulative or emergency taxation, benefits, refunds, bonuses and employer-specific rounding.</div></footer>
    </main>
  );
}

function BandVisual({ country, salary, currency, locale, large = false }: { country: CountryCode; salary: number; currency: string; locale: string; large?: boolean }) {
  const bands = country === 'IE'
    ? [{ label: '20%', end: 44000, color: 'mint' }, { label: '40%', end: 120000, color: 'navy' }]
    : country === 'UK'
      ? [{ label: '0%', end: 12570, color: 'pale' }, { label: '20%', end: 50270, color: 'mint' }, { label: '40%+', end: 125140, color: 'navy' }]
      : [{ label: '0%', end: 400000, color: 'pale' }, { label: '5–15%', end: 1600000, color: 'mint' }, { label: '20–30%', end: 3000000, color: 'navy' }];
  const max = Math.max(bands.at(-1)?.end ?? salary, salary * 1.08);
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0, notation: large ? 'compact' : 'standard' });
  return <div className={large ? 'band-visual large' : 'band-visual'}><div className="band-title"><span>Taxable salary</span><b>{formatter.format(salary)}</b></div><div className="band-track">{bands.map((band, index) => { const start = index === 0 ? 0 : bands[index - 1].end; return <span className={band.color} key={band.label} style={{ width: `${Math.max(3, ((Math.min(max, band.end) - start) / max) * 100)}%` }}><i>{band.label}</i></span>; })}<div className="salary-marker" style={{ left: `${Math.min(98, (salary / max) * 100)}%` }}><b></b><span>You</span></div></div><div className="band-axis"><span>{formatter.format(0)}</span><span>{formatter.format(max)}</span></div><p>Only each slice is charged at the rate shown. Social contributions may use separate thresholds.</p></div>;
}
