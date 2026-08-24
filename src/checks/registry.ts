import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';

/** Checks das Fases 0–1, na ordem em que o CLI os roda. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids];
