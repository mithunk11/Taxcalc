import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { engines } from '@/lib/tax/engines';

export const metadata: Metadata = { title: 'Tax Rules & Sources' };
export default function SourcesPage() { return <InfoPage eyebrow="Official-source registry" title="Tax rules you can inspect." intro="Every enabled engine is tied to a tax year, an engine version and primary government material. Rates are never auto-scraped into production."><div className="source-registry">{Object.values(engines).map((engine) => <section key={engine.code}><div><span>{engine.code === 'IE' ? '🇮🇪' : engine.code === 'UK' ? '🇬🇧' : '🇮🇳'}</span><h2>{engine.country}<small>{engine.taxYear} · Engine {engine.engineVersion} · Verified {engine.lastVerified}</small></h2></div>{engine.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.authority}</span><b>{source.title}</b></a>)}</section>)}</div><h2>Rule expiry safety</h2><p>TaxCalc only labels the years shown above as supported. A future tax year will not be presented as current until its rules are officially published, implemented and tested.</p></InfoPage>; }
