import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { engines } = await vite.ssrLoadModule('/lib/tax/engines/index.ts');
const { major, solveGross } = await vite.ssrLoadModule('/lib/tax/money.ts');
after(async () => vite.close());

const scenarios = {
  IE: { status: 'single' },
  UK: { ukRegion: 'england', studentLoan: 'none' },
  IN: { indiaRegime: 'new' },
};

for (const code of ['IE', 'UK', 'IN']) {
  test(`${code}: zero salary returns zero and never NaN`, () => {
    const result = engines[code].calculate({ gross: 0, ...scenarios[code] });
    assert.equal(result.net, 0);
    assert.ok(Object.values(result).every((value) => typeof value !== 'number' || Number.isFinite(value)));
  });

  test(`${code}: every deduction reconciles exactly to net pay`, () => {
    const gross = code === 'IN' ? major(1_800_000) : major(code === 'IE' ? 60_000 : 55_000);
    const result = engines[code].calculate({ gross, ...scenarios[code] });
    assert.equal(result.net, result.gross - result.incomeTax - result.social - result.pension - result.other);
  });

  test(`${code}: net-to-gross round-trip converges within one minor unit`, () => {
    const originalGross = code === 'IN' ? major(2_400_000) : major(code === 'IE' ? 75_000 : 68_000);
    const original = engines[code].calculate({ gross: originalGross, ...scenarios[code] });
    const solved = solveGross(original.net, (gross) => engines[code].calculate({ gross, ...scenarios[code] }).net);
    assert.ok(Math.abs(solved - originalGross) <= 1, `${solved} vs ${originalGross}`);
  });
}

test('Ireland: USC exemption applies through €13,000', () => {
  assert.equal(engines.IE.calculate({ gross: major(13_000), status: 'single' }).items.find((item) => item.id === 'usc'), undefined);
  assert.ok(engines.IE.calculate({ gross: major(13_001), status: 'single' }).items.find((item) => item.id === 'usc').amount > 0);
});

test('Ireland: PAYE credit protects low income from Income Tax', () => {
  assert.equal(engines.IE.calculate({ gross: major(20_000), status: 'single' }).incomeTax, 0);
});

test('Ireland: higher band begins above €44,000 for a single employee', () => {
  const below = engines.IE.calculate({ gross: major(44_000), status: 'single' }).incomeTax;
  const above = engines.IE.calculate({ gross: major(44_001), status: 'single' }).incomeTax;
  assert.equal(above - below, major(0.4));
});

test('Ireland: one-income married band is higher than the single band', () => {
  const single = engines.IE.calculate({ gross: major(50_000), status: 'single' }).incomeTax;
  const married = engines.IE.calculate({ gross: major(50_000), status: 'married-one-income' }).incomeTax;
  assert.ok(married < single);
});

test('UK: Personal Allowance produces no Income Tax at £12,570', () => {
  assert.equal(engines.UK.calculate({ gross: major(12_570), ukRegion: 'england' }).incomeTax, 0);
});

test('UK: standard Personal Allowance tapers above £100,000', () => {
  const atLimit = engines.UK.calculate({ gross: major(100_000), ukRegion: 'england' }).incomeTax;
  const above = engines.UK.calculate({ gross: major(100_002), ukRegion: 'england' }).incomeTax;
  assert.ok(above - atLimit >= major(1.2));
});

test('UK: Scottish income tax is independently calculated', () => {
  const england = engines.UK.calculate({ gross: major(60_000), ukRegion: 'england' }).incomeTax;
  const scotland = engines.UK.calculate({ gross: major(60_000), ukRegion: 'scotland' }).incomeTax;
  assert.notEqual(scotland, england);
});

test('UK: Plan 2 threshold boundary is respected', () => {
  const at = engines.UK.calculate({ gross: major(29_385), ukRegion: 'england', studentLoan: 'plan2' });
  const above = engines.UK.calculate({ gross: major(30_000), ukRegion: 'england', studentLoan: 'plan2' });
  assert.equal(at.items.find((item) => item.id === 'student-loan'), undefined);
  assert.ok(above.items.find((item) => item.id === 'student-loan').amount > 0);
});

test('India: New Regime standard deduction plus rebate gives zero tax at ₹12.75 lakh salary', () => {
  assert.equal(engines.IN.calculate({ gross: major(1_275_000), indiaRegime: 'new' }).incomeTax, 0);
});

test('India: marginal relief limits tax just above ₹12 lakh taxable income', () => {
  const result = engines.IN.calculate({ gross: major(1_300_000), indiaRegime: 'new' });
  assert.equal(result.incomeTax, major(26_000));
});

test('India: Old Regime PF deduction is capped at ₹1.5 lakh', () => {
  const ten = engines.IN.calculate({ gross: major(3_000_000), indiaRegime: 'old', pensionBps: 1000 });
  const twelve = engines.IN.calculate({ gross: major(3_000_000), indiaRegime: 'old', pensionBps: 1200 });
  assert.equal(ten.taxable, twelve.taxable);
});
