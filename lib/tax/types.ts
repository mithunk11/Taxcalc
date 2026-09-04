export type CountryCode = 'IE' | 'UK' | 'IN';
export type UkRegion = 'england' | 'scotland' | 'wales' | 'northern-ireland';
export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate';
export type IndiaRegime = 'new' | 'old';

export interface TaxInput {
  gross: number;
  bonus?: number;
  pensionBps?: number;
  status?: 'single' | 'married-one-income';
  ukRegion?: UkRegion;
  studentLoan?: StudentLoanPlan;
  indiaRegime?: IndiaRegime;
  otherDeduction?: number;
}

export interface LineItem {
  id: string;
  label: string;
  amount: number;
  kind: 'tax' | 'social' | 'pension' | 'other';
  explanation: string;
}

export interface TaxResult {
  country: CountryCode;
  gross: number;
  taxable: number;
  incomeTax: number;
  social: number;
  pension: number;
  other: number;
  net: number;
  employerCost?: number;
  marginalRateBps: number;
  items: LineItem[];
  assumptions: string[];
}

export interface SourceRecord {
  title: string;
  authority: string;
  url: string;
}

export interface CountryEngine {
  code: CountryCode;
  country: string;
  currency: string;
  locale: string;
  taxYear: string;
  engineVersion: string;
  lastVerified: string;
  calculate(input: TaxInput): TaxResult;
  sources: SourceRecord[];
}
