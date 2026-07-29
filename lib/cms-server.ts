import 'server-only';

/* Reading a section. Split from lib/cms.ts so the merge itself stays pure and
 * importable by the unit tests without dragging in `server-only` or fetch. */

import { DEFAULTS, mergeSection, SECTION_KEYS, type SectionKey, type Sections } from './cms.ts';
import { readStoredSections } from './supabase.ts';

/**
 * One section, defaults merged with whatever the database holds.
 * Returns the code defaults on any failure whatsoever — unreachable database,
 * missing row, malformed JSON, stale shape. This never throws.
 */
export async function getSection<K extends SectionKey>(key: K): Promise<Sections[K]> {
  try {
    const stored = await readStoredSections();
    return mergeSection(key, stored[key]);
  } catch (e) {
    console.warn(`[cms] code defaults for "${key}" —`, (e as Error).message);
    return DEFAULTS[key];
  }
}

/** Every section at once, for the editor's baseline snapshot. */
export async function getAllSections(): Promise<Sections> {
  try {
    const stored = await readStoredSections();
    return Object.fromEntries(
      SECTION_KEYS.map((k) => [k, mergeSection(k, stored[k])]),
    ) as Sections;
  } catch {
    return DEFAULTS;
  }
}
