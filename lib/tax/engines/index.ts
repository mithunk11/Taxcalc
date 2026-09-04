import { india2026 } from './india-2026';
import { ireland2026 } from './ireland-2026';
import { uk2026 } from './uk-2026';
import type { CountryCode, CountryEngine } from '../types';

export const engines: Record<CountryCode, CountryEngine> = { IE: ireland2026, UK: uk2026, IN: india2026 };
export { india2026, ireland2026, uk2026 };
