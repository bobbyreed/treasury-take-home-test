/**
 * Required-field rules.
 *
 * A label's verdict is NEEDS_REVIEW if any *required* field doesn't match. The
 * required set is the same for every label — brand, class/type, ABV, net
 * contents, producer, and the government warning — plus country of origin when
 * the application marks the product as imported.
 *
 * (Earlier drafts varied the required set by beverage type. That was removed: it
 * added a form field and a branch without changing the outcomes a reviewer cares
 * about. A product that legitimately has no ABV is handled by leaving the ABV
 * application value blank, not by special-casing the type.)
 */

export const FIELDS = [
  'brandName', 'classType', 'abv', 'netContents', 'producer', 'countryOfOrigin', 'warning',
];

const REQUIRED = ['brandName', 'classType', 'abv', 'netContents', 'producer', 'warning'];

/**
 * Resolve the required fields. Imports additionally require country of origin.
 * @param {boolean} [isImport=false]
 * @returns {{ requiredFields: string[] }}
 */
export function rulesFor(isImport = false) {
  return { requiredFields: isImport ? [...REQUIRED, 'countryOfOrigin'] : [...REQUIRED] };
}
