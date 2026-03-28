/**
 * effortEstimation.js
 *
 * Phase 1: Rule-based cleanup effort estimation.
 * Phase 2: Replace estimateEffort() with a Claude Vision API call — same return shape.
 *
 * Return shape: { hours: number, basis: string }
 */

// Base hours per person for each severity level (1–5)
const BASE_HOURS = { 1: 0.5, 2: 1, 3: 2.5, 4: 5, 5: 9 };

// Notes keywords that indicate harder/more complex cleanup
const KEYWORD_MODIFIERS = [
  { terms: ['construction', 'debris', 'rubble', 'bricks', 'cement', 'sand'], factor: 1.5, note: 'construction debris' },
  { terms: ['medical', 'hospital', 'syringe', 'chemical', 'toxic', 'hazardous'], factor: 2.0, note: 'hazardous material' },
  { terms: ['bulk', 'furniture', 'sofa', 'mattress', 'fridge', 'refrigerator', 'appliance'], factor: 1.6, note: 'bulk items' },
  { terms: ['drain', 'nala', 'canal', 'gutter', 'naali', 'blocked'], factor: 1.8, note: 'drainage/nala' },
  { terms: ['road', 'highway', 'divider', 'traffic'], factor: 1.3, note: 'roadside' },
];

/**
 * Estimate cleanup effort for a garbage report.
 *
 * @param {number} severity  - 1 to 5
 * @param {string} notes     - optional user-entered notes
 * @returns {{ hours: number, basis: string }}
 *
 * --- Phase 2 upgrade path ---
 * Replace this function body with a fetch() to /api/estimate-effort
 * that calls Claude Vision with the garbage photo URL.
 * Keep the same return shape so callers need zero changes.
 */
export function estimateEffort(severity, notes = '') {
  const base = BASE_HOURS[severity] ?? 2.5;
  const lowerNotes = (notes || '').toLowerCase();

  let factor = 1.0;
  const matchedNotes = [];

  for (const mod of KEYWORD_MODIFIERS) {
    if (mod.terms.some((t) => lowerNotes.includes(t))) {
      factor = Math.max(factor, mod.factor);
      matchedNotes.push(mod.note);
    }
  }

  const hours = Math.round(base * factor * 10) / 10;
  const basis =
    matchedNotes.length > 0
      ? `Severity ${severity} + ${matchedNotes.join(', ')}`
      : `Severity ${severity} baseline`;

  return { hours, basis };
}

/**
 * Format hours into a human-readable string.
 * e.g. 0.5 → "30 min", 2.5 → "2.5 hrs", 1 → "1 hr"
 */
export function formatEffort(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours === Math.floor(hours)) return `${hours} hr${hours !== 1 ? 's' : ''}`;
  return `${hours} hrs`;
}
