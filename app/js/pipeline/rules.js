/**
 * Beverage-specific rule sets — which fields are required per beverage type.
 *
 * DRAFT: first cut from the TTB requirements in docs/PLAN.md §5. To be validated
 * in M4 and refined against the data-structure details Bobby requested from TTB.
 * The government warning is required on every beverage type.
 *
 * @typedef {'spirits'|'wine'|'beer'|'other'} BeverageType
 */

export const FIELDS = [
  'brandName', 'classType', 'abv', 'netContents', 'producer', 'countryOfOrigin', 'warning',
];

/** @type {Record<string, { beverageType: string, requiredFields: string[], abvRequired: boolean, notes: string }>} */
export const BEVERAGE_RULES = {
  spirits: {
    beverageType: 'spirits',
    requiredFields: ['brandName', 'classType', 'abv', 'netContents', 'producer', 'warning'],
    abvRequired: true,
    notes: 'ABV mandatory; proof optional/secondary.',
  },
  wine: {
    beverageType: 'wine',
    requiredFields: ['brandName', 'classType', 'abv', 'netContents', 'producer', 'warning'],
    abvRequired: true,
    notes: 'ABV required for most; some categories excepted — refine per TTB.',
  },
  beer: {
    beverageType: 'beer',
    requiredFields: ['brandName', 'classType', 'netContents', 'producer', 'warning'],
    abvRequired: false,
    notes: 'ABV has exceptions for malt beverages.',
  },
  other: {
    beverageType: 'other',
    requiredFields: ['brandName', 'classType', 'netContents', 'producer', 'warning'],
    abvRequired: false,
    notes: 'Fallback when type is unknown.',
  },
};

/**
 * Resolve the effective rules for a beverage type. Imports additionally require
 * country of origin.
 * @param {string} beverageType
 * @param {boolean} [isImport=false]
 * @returns {{ beverageType: string, requiredFields: string[], abvRequired: boolean, notes: string }}
 */
export function rulesFor(beverageType, isImport = false) {
  const base = BEVERAGE_RULES[beverageType] ?? BEVERAGE_RULES.other;
  const requiredFields = isImport
    ? [...new Set([...base.requiredFields, 'countryOfOrigin'])]
    : [...base.requiredFields];
  return { ...base, requiredFields };
}
