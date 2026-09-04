import { major, percent, taxBands } from '../money';
import type { CountryEngine, LineItem, TaxInput, TaxResult } from '../types';

function surcharge(baseTax: number, taxable: number, regime: 'new' | 'old') {
  const levels = regime === 'new'
    ? [{ threshold: 20000000, rate: 2500 }, { threshold: 10000000, rate: 1500 }, { threshold: 5000000, rate: 1000 }]
    : [{ threshold: 50000000, rate: 3700 }, { threshold: 20000000, rate: 2500 }, { threshold: 10000000, rate: 1500 }, { threshold: 5000000, rate: 1000 }];
  const hit = levels.find((level) => taxable > major(level.threshold));
  if (!hit) return 0;
  const raw = percent(baseTax, hit.rate);
  const incomeExcess = taxable - major(hit.threshold);
  return Math.min(raw, Math.max(0, incomeExcess));
}

export const india2026: CountryEngine = {
  code: 'IN', country: 'India', currency: 'INR', locale: 'en-IN', taxYear: 'FY 2026–27', engineVersion: '2026.1', lastVerified: '4 Sep 2026',
  sources: [
    { title: 'Finance Bill 2026 — Memorandum', authority: 'India Budget', url: 'https://www.indiabudget.gov.in/doc/memo.pdf' },
    { title: 'Salaried individuals — tax slabs', authority: 'Income Tax Department', url: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1' },
    { title: 'ITR validation rules — standard deduction', authority: 'Income Tax Department', url: 'https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-05/CBDT_e-Filing_ITR%201_Validation%20Rules_AY%202026-27.pdf' },
  ],
  calculate(input: TaxInput): TaxResult {
    const gross = Math.max(0, Math.round(input.gross + (input.bonus ?? 0)));
    const regime = input.indiaRegime ?? 'new';
    const pensionBps = Math.min(1200, Math.max(0, input.pensionBps ?? 0));
    const pension = percent(gross, pensionBps);
    const standardDeduction = major(regime === 'new' ? 75000 : 50000);
    const oldRegime80C = regime === 'old' ? Math.min(pension, major(150000)) : 0;
    const taxable = Math.max(0, gross - standardDeduction - oldRegime80C);
    let baseTax = regime === 'new'
      ? taxBands(taxable, [
          { upTo: major(400000), rate: 0 }, { upTo: major(800000), rate: 500 }, { upTo: major(1200000), rate: 1000 },
          { upTo: major(1600000), rate: 1500 }, { upTo: major(2000000), rate: 2000 }, { upTo: major(2400000), rate: 2500 }, { upTo: Number.MAX_SAFE_INTEGER, rate: 3000 },
        ])
      : taxBands(taxable, [
          { upTo: major(250000), rate: 0 }, { upTo: major(500000), rate: 500 }, { upTo: major(1000000), rate: 2000 }, { upTo: Number.MAX_SAFE_INTEGER, rate: 3000 },
        ]);
    if (regime === 'new' && taxable <= major(1200000)) baseTax = Math.max(0, baseTax - major(60000));
    if (regime === 'new' && taxable > major(1200000)) baseTax = Math.min(baseTax, taxable - major(1200000));
    if (regime === 'old' && taxable <= major(500000)) baseTax = Math.max(0, baseTax - major(12500));
    const surchargeAmount = surcharge(baseTax, taxable, regime);
    const cess = percent(baseTax + surchargeAmount, 400);
    const incomeTax = baseTax + surchargeAmount + cess;
    const other = Math.max(0, Math.round(input.otherDeduction ?? 0));
    const social = pension;
    const net = Math.max(0, gross - pension - incomeTax - other);
    const items: LineItem[] = [
      { id: 'income-tax', label: 'Income Tax', amount: baseTax, kind: 'tax', explanation: `${regime === 'new' ? 'New' : 'Old'} regime slab tax after any applicable section 87A rebate or marginal relief.` },
      { id: 'surcharge', label: 'Surcharge', amount: surchargeAmount, kind: 'tax', explanation: 'High-income surcharge with a marginal-relief guard at supported thresholds.' },
      { id: 'cess', label: 'Health & Education Cess', amount: cess, kind: 'tax', explanation: '4% of income tax plus surcharge.' },
      { id: 'pf', label: 'Employee PF / retirement', amount: pension, kind: 'pension', explanation: regime === 'old' ? 'User-entered contribution, with an 80C deduction capped at ₹1.5 lakh.' : 'User-entered payroll contribution; no fictional 80C relief is applied under the New Regime.' },
      { id: 'other', label: 'Other payroll deductions', amount: other, kind: 'other', explanation: 'Manual professional tax or another post-tax payroll deduction.' },
    ];
    return {
      country: 'IN', gross, taxable, incomeTax, social, pension, other, net, marginalRateBps: taxable > major(2400000) ? 3120 : taxable > major(1200000) ? 1560 : 1040,
      items: items.filter((item) => item.amount > 0),
      assumptions: [`${regime === 'new' ? 'New' : 'Old'} tax regime`, `₹${regime === 'new' ? '75,000' : '50,000'} salary standard deduction`, 'Resident salaried individual under 60', 'No special-rate income', 'PF entered as an actual percentage', 'Professional tax excluded unless entered manually'],
    };
  },
};
