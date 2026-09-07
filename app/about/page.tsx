import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = { title: 'About' };
export default function AboutPage() { return <InfoPage eyebrow="A Techvora product" title="A clearer way to understand your pay." intro="TaxCalc was created to answer two ordinary but surprisingly difficult questions: what will land in my bank, and what salary do I need to ask for?"><h2>Built for understanding</h2><p>Numbers remain primary, but each deduction has an explanation, every assumption is visible, and progressive rates are shown as slices rather than a single misleading percentage.</p><h2>Accuracy before country count</h2><p>Ireland, the United Kingdom and India each use an independent engine. More countries can be added only after official research, implementation and boundary testing.</p></InfoPage>; }
