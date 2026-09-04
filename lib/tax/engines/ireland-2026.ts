import { major, percent, taxBands } from '../money';
import type { CountryEngine, LineItem, TaxInput, TaxResult } from '../types';

export const ireland2026: CountryEngine = {
  code: 'IE',
  country: 'Ireland',
  currency: 'EUR',
  locale: 'en-IE',
  taxYear: '2026',
  engineVersion: '2026.2',
  lastVerified: '4 Sep 2026',
  sources: [
    { title: 'Tax rates, bands and reliefs', authority: 'Revenue', url: 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/tax-relief-charts/index.aspx' },
    { title: 'Standard USC rates and thresholds', authority: 'Revenue', url: 'https://www.revenue.ie/en/jobs-and-pensions/usc/standard-rates-thresholds.aspx' },
    { title: 'PRSI Class A rates', authority: 'Department of Social Protection', url: 'https://www.gov.ie/en/department-of-social-protection/publications/prsi-class-a-rates/' },
  ],
  calculate(input: TaxInput): TaxResult {
    const gross = Math.max(0, Math.round(input.gross + (input.bonus ?? 0)));
    const pensionBps = Math.min(1500, Math.max(0, input.pensionBps ?? 0));
    const pension = percent(gross, pensionBps);
    const taxable = Math.max(0, gross - pension);
    const married = input.status === 'married-one-income';
    const band = major(married ? 53000 : 44000);
    const credits = major(married ? 6000 : 4000);
    const grossTax = taxBands(taxable, [{ upTo: band, rate: 2000 }, { upTo: Number.MAX_SAFE_INTEGER, rate: 4000 }]);
    const incomeTax = Math.max(0, grossTax - credits);

    let usc = 0;
    if (gross > major(13000)) {
      usc = taxBands(gross, [
        { upTo: major(12012), rate: 50 },
        { upTo: major(28700), rate: 200 },
        { upTo: major(70044), rate: 300 },
        { upTo: Number.MAX_SAFE_INTEGER, rate: 800 },
      ]);
    }

    const weekly = gross / 52;
    const blendedEmployeeRate = 423.75;
    let prsi = 0;
    if (weekly > major(352)) {
      const rawWeekly = percent(Math.round(weekly), blendedEmployeeRate);
      const credit = weekly <= major(424)
        ? Math.max(0, major(12) - Math.round((weekly - major(352)) / 6))
        : 0;
      prsi = Math.max(0, Math.round((rawWeekly - credit) * 52));
    }
    const other = Math.max(0, Math.round(input.otherDeduction ?? 0));
    const net = Math.max(0, gross - pension - incomeTax - usc - prsi - other);
    const employerRate = weekly > major(552) ? 1128.75 : 903.75;
    const employerCost = gross + percent(gross, employerRate);
    const social = usc + prsi;
    const items: LineItem[] = [
      { id: 'income-tax', label: 'Income Tax (PAYE)', amount: incomeTax, kind: 'tax', explanation: '20% and 40% bands, less the selected standard tax credits.' },
      { id: 'usc', label: 'Universal Social Charge', amount: usc, kind: 'social', explanation: 'A separate charge applied in slices across the 2026 USC bands.' },
      { id: 'prsi', label: 'PRSI Class A', amount: prsi, kind: 'social', explanation: 'Annualised Class A estimate, including the October 2026 rate change and tapered weekly credit.' },
      { id: 'pension', label: 'Pension contribution', amount: pension, kind: 'pension', explanation: 'Modelled as an ordinary employee contribution with income-tax relief only, capped here at 15%.' },
      { id: 'other', label: 'Other payroll deductions', amount: other, kind: 'other', explanation: 'A user-entered post-tax payroll deduction.' },
    ];
    return {
      country: 'IE', gross, taxable, incomeTax, social, pension, other, net, employerCost,
      marginalRateBps: taxable > band ? 4723.75 : 2723.75,
      items: items.filter((item) => item.amount > 0),
      assumptions: [married ? 'Married/civil partnership, one income' : 'Single', 'PAYE employee', 'PRSI Class A', 'Standard personal and employee tax credits', 'Annual estimate with 2026 effective-date weighted PRSI'],
    };
  },
};
