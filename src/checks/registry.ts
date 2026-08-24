import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';
import { ci3Traceability } from './ci3-traceability.ts';

/** Checks das Fases 0–2, na ordem em que o CLI os roda. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids, ci3Traceability];
