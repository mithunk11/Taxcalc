import { major, percent, taxBands } from '../money';
import type { CountryEngine, LineItem, StudentLoanPlan, TaxInput, TaxResult } from '../types';

const loanThresholds: Record<StudentLoanPlan, number> = { none: 0, plan1: 26900, plan2: 29385, plan4: 33795, plan5: 25000, postgraduate: 21000 };

export const uk2026: CountryEngine = {
  code: 'UK', country: 'United Kingdom', currency: 'GBP', locale: 'en-GB', taxYear: '2026/27', engineVersion: '2026.1', lastVerified: '4 Sep 2026',
  sources: [
    { title: 'Income Tax rates and allowances', authority: 'HMRC', url: 'https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past' },
    { title: 'Rates and thresholds for employers 2026 to 2027', authority: 'HMRC', url: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027' },
    { title: 'Scottish Income Tax 2026 to 2027', authority: 'Scottish Government', url: 'https://www.gov.scot/publications/scottish-income-tax-technical-factsheet/' },
    { title: 'Student loan repayment guidance', authority: 'HMRC', url: 'https://www.gov.uk/guidance/special-rules-for-student-loans' },
  ],
  calculate(input: TaxInput): TaxResult {
    const gross = Math.max(0, Math.round(input.gross + (input.bonus ?? 0)));
    const pensionBps = Math.min(3000, Math.max(0, input.pensionBps ?? 0));
    const pension = percent(gross, pensionBps);
    const adjustedGross = Math.max(0, gross - pension);
    const allowanceReduction = Math.floor(Math.max(0, adjustedGross - major(100000)) / 2);
    const allowance = Math.max(0, major(12570) - allowanceReduction);
    const taxable = Math.max(0, adjustedGross - allowance);
    const scotland = input.ukRegion === 'scotland';
    const incomeTax = scotland
      ? taxBands(taxable, [
          { upTo: major(3967), rate: 1900 }, { upTo: major(16956), rate: 2000 }, { upTo: major(31092), rate: 2100 },
          { upTo: major(62430), rate: 4200 }, { upTo: major(125140), rate: 4500 }, { upTo: Number.MAX_SAFE_INTEGER, rate: 4800 },
        ])
      : taxBands(taxable, [
          { upTo: major(37700), rate: 2000 }, { upTo: major(125140), rate: 4000 }, { upTo: Number.MAX_SAFE_INTEGER, rate: 4500 },
        ]);

    const monthly = adjustedGross / 12;
    const niMonthly = percent(Math.min(Math.max(0, monthly - major(1048)), major(4189 - 1048)), 800) + percent(Math.max(0, monthly - major(4189)), 200);
    const ni = Math.round(niMonthly * 12);
    const loanPlan = input.studentLoan ?? 'none';
    const loanRate = loanPlan === 'postgraduate' ? 600 : 900;
    const studentLoan = loanPlan === 'none' ? 0 : Math.floor(percent(Math.max(0, gross - major(loanThresholds[loanPlan])), loanRate) / 100) * 100;
    const other = Math.max(0, Math.round(input.otherDeduction ?? 0));
    const social = ni + studentLoan;
    const net = Math.max(0, gross - pension - incomeTax - social - other);
    const employerNi = percent(Math.max(0, adjustedGross - major(5000)), 1500);
    const marginalRate = scotland ? (adjustedGross > major(75000) ? 4700 : adjustedGross > major(43662) ? 5000 : 2900) : adjustedGross > major(125140) ? 4700 : adjustedGross > major(50270) ? 4200 : 2800;
    const items: LineItem[] = [
      { id: 'income-tax', label: scotland ? 'Scottish Income Tax' : 'Income Tax', amount: incomeTax, kind: 'tax', explanation: scotland ? 'Scottish non-savings employment-income bands for 2026/27.' : 'UK employment-income bands after the tapered Personal Allowance.' },
      { id: 'ni', label: 'National Insurance', amount: ni, kind: 'social', explanation: 'Category A employee NI, estimated using monthly payroll thresholds.' },
      { id: 'student-loan', label: loanPlan === 'postgraduate' ? 'Postgraduate loan' : 'Student loan', amount: studentLoan, kind: 'social', explanation: 'Payroll deduction using the selected 2026/27 plan threshold and rate.' },
      { id: 'pension', label: 'Salary sacrifice pension', amount: pension, kind: 'pension', explanation: 'Reduces taxable and National Insurance pay in this estimate.' },
      { id: 'other', label: 'Other payroll deductions', amount: other, kind: 'other', explanation: 'A user-entered post-tax payroll deduction.' },
    ];
    return {
      country: 'UK', gross, taxable, incomeTax, social, pension, other, net, employerCost: gross + employerNi, marginalRateBps: marginalRate + (loanPlan === 'none' ? 0 : loanRate),
      items: items.filter((item) => item.amount > 0),
      assumptions: [scotland ? 'Scottish taxpayer' : `${input.ukRegion === 'wales' ? 'Wales' : input.ukRegion === 'northern-ireland' ? 'Northern Ireland' : 'England'} taxpayer`, 'Standard Personal Allowance with income taper', 'NI category A', loanPlan === 'none' ? 'No student loan' : `${loanPlan.replace('plan', 'Plan ')} payroll deduction`, 'Annual income tax; monthly NI estimate'],
    };
  },
};
