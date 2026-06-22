/**
 * Guided Practice curriculum: 18 levels over the clean label set.
 *
 * Pure data + helpers (no DOM), so the integrity of the curriculum is
 * unit-tested. Each level pre-loads a real label image and runs the real
 * offline pipeline; the learner's Approve / Request-review CALL is what gates
 * progression (see docs — gating is the judgment, not the live OCR verdict, so
 * it's robust to OCR variance).
 *
 * Level types alternate:
 *  - 'enter'  : the learner transcribes the application paperwork into the form,
 *               then runs and judges. (paperwork may be right OR wrong)
 *  - 'judge'  : the form arrives pre-filled, as if another agent entered it
 *               (possibly with an error); the learner runs and judges.
 *
 * `answer` is the correct call. `badFields` lists the field(s) at fault on a
 * 'review' answer (used by the optional "which field?" follow-up); empty on an
 * 'approve'. Authored answers are chosen to match the tool's documented behavior
 * on these labels, so the live verdict the learner sees agrees with the call.
 */

// Root-absolute so the same level data works from both /practice.html and the
// mobile /m/practice.html (page-relative paths would resolve under /m/).
const IMG = (name) => `/practice/labels/${name}.jpg`;

/** @type {ReadonlyArray<object>} */
const RAW = [
  {
    label: 'MountainPeak', product: 'Mountain Peak Brewing — IPA', type: 'enter', isImport: false,
    values: { brandName: 'Mountain Peak Brewing', classType: 'India Pale Ale (IPA)', abv: '7.2% Alc./Vol.', netContents: '12 FL. OZ. (355 mL)', producer: 'Brewed & Canned by Mountain Peak Brewing, Denver, CO', countryOfOrigin: '' },
    answer: 'approve', badFields: [],
    teach: 'Every required field matched the label, so this one passes. A clean PASS is your green light to approve.',
  },
  {
    label: 'CityCenter', product: 'City Center Brewery — Light Lager', type: 'judge', isImport: false,
    values: { brandName: 'City Center Brewery', classType: 'Light Lager', abv: '4.2% Alc./Vol.', netContents: '12 FL. OZ. (355 mL)', producer: 'Brewed & Canned by City Center Brewery, Milwaukee, WI', countryOfOrigin: '' },
    answer: 'approve', badFields: [],
    teach: 'The entered values all match the label. Nothing to flag — approve.',
  },
  {
    label: 'GoldenHarvest', product: 'Golden Harvest — Saison', type: 'enter', isImport: false,
    values: { brandName: 'Sunrise Fields', classType: 'Farmhouse Ale / Saison', abv: '6.0% Alc./Vol.', netContents: '1 PINT 6 FL. OZ. (750 mL)', producer: 'Brewed & Bottled by Golden Harvest Brewery, Portland, OR', countryOfOrigin: '' },
    answer: 'review', badFields: ['brandName'],
    teach: 'The application says the brand is "Sunrise Fields", but the label clearly reads "Golden Harvest". A brand mismatch is a real flag — request review.',
  },
  {
    label: 'JuniperGrove', product: 'Juniper Grove — Gin', type: 'judge', isImport: false,
    values: { brandName: 'Juniper Grove', classType: 'Distilled Gin', abv: '50% Alc./Vol. (100 Proof)', netContents: '750 mL', producer: 'Distilled by Juniper Grove Distilling, Golden, CO. Bottled for Alpine Spirits, Boulder, CO', countryOfOrigin: '' },
    answer: 'review', badFields: ['abv'],
    teach: 'The entered alcohol content (50% / 100 proof) does not match the label (43% / 86 proof). ABV errors matter — request review.',
  },
  {
    label: 'SmokyMountain', product: 'Smoky Mountain — Corn Whiskey', type: 'enter', isImport: false,
    values: { brandName: 'Smoky Mountain', classType: 'Corn Whiskey', abv: '50% Alc./Vol. (100 Proof)', netContents: '375 mL', producer: 'Distilled & Bottled by Smoky Mountain Distillery, Gatlinburg, TN', countryOfOrigin: '' },
    answer: 'approve', badFields: [],
    teach: 'Everything matches, including the 375 mL net contents. Approve.',
  },
  {
    label: 'MadScientist', product: 'The Mad Scientist — Imperial Stout', type: 'judge', isImport: false,
    values: { brandName: 'the mad scientist', classType: 'Imperial Stout', abv: '13.5% Alc./Vol.', netContents: '16 FL. OZ. (473 mL)', producer: 'Brewed, Aged & Canned by Mad Scientist Brewery, Atlanta, GA', countryOfOrigin: '' },
    answer: 'approve', badFields: [],
    teach: 'The brand was entered in lowercase ("the mad scientist") but the label is "The Mad Scientist". Case-only differences are a MINOR difference, not a mismatch — the tool still passes it, and so should you. Approve.',
  },
  {
    label: 'PioneerCellars', product: 'Pioneer Cellars — Port-style Wine', type: 'enter', isImport: false,
    values: { brandName: 'Pioneer Cellars', classType: 'Dry Red Table Wine', abv: '19.5% VOL.', netContents: '750 mL', producer: 'Produced & Bottled by Pioneer Cellars, Sonoma, CA', countryOfOrigin: '' },
    answer: 'review', badFields: ['classType'],
    teach: 'The class/type on the application ("Dry Red Table Wine") is not what the label states ("Fortified Wine / Port style"). Class/type drives how a product is regulated — request review.',
  },
  {
    label: 'SpicyBadger', product: 'The Spicy Badger — Habanero Mead', type: 'judge', isImport: false,
    values: { brandName: 'The Spicy Badger', classType: 'Habanero Mead', abv: '9.0% VOL.', netContents: '375 mL', producer: 'Produced & Bottled by Spicy Badger Meadery, Phoenix, AZ', countryOfOrigin: '' },
    answer: 'review', badFields: ['abv'],
    teach: 'The entered ABV (9.0%) is well below the label (14.5%). Request review.',
  },
  {
    label: 'RioAzul', product: 'Río Azul — Añejo Tequila (import)', type: 'enter', isImport: true,
    values: { brandName: 'Río Azul Spirits', classType: 'Añejo Tequila', abv: '40% Alc./Vol. (80 Proof)', netContents: '750 mL', producer: 'Distilled by Río Azul Spirits, Tequila, Jalisco, Mexico. Imported by Golden Eagle Imports, San Antonio, TX', countryOfOrigin: 'MEXICO' },
    answer: 'approve', badFields: [],
    teach: 'An import — so country of origin is required, and "MEXICO" matches the label. All fields check out. Approve.',
  },
  {
    label: 'HighlandCask', product: 'Highland Cask — Scotch (import)', type: 'judge', isImport: true,
    values: { brandName: 'Highland Cask', classType: 'Blended Scotch Whisky', abv: '43% Alc./Vol. (86 Proof)', netContents: '750 mL', producer: 'Distilled, Blended & Bottled in Scotland. Imported by Albion Spirits, Boston, MA', countryOfOrigin: 'FRANCE' },
    answer: 'review', badFields: ['countryOfOrigin'],
    teach: 'Country of origin was entered as "FRANCE", but this is a Blended Scotch — the label says Scotland. Request review.',
  },
  {
    label: 'HighDesert', product: 'High Desert — Mezcal (import)', type: 'enter', isImport: true,
    values: { brandName: 'High Desert', classType: 'Mezcal Joven (100% Maguey Espadín)', abv: '42% Alc./Vol. (84 Proof)', netContents: '750 mL', producer: 'Product of Mexico. Bottled by Mezcal de Oaxaca, S.A. de C.V. Imported by Border Crossings Imports, El Paso, TX', countryOfOrigin: '' },
    answer: 'review', badFields: ['countryOfOrigin'],
    teach: 'This is an import, but the application left country of origin blank — and imports require it. The tool flags the missing field. Request review (the applicant needs to supply the country).',
  },
  {
    label: 'OldPort', product: 'Old Port Brewery — Stout (import)', type: 'judge', isImport: true,
    values: { brandName: 'Old Port Brewery', classType: 'Stout', abv: '4.3% Alc./Vol.', netContents: '12 FL. OZ. (355 mL)', producer: 'Product of Ireland. Brewed by Old Port Brewery, Dublin, Ireland. Imported by Global Beverage Partners, New York, NY', countryOfOrigin: 'IRELAND' },
    answer: 'review', badFields: ['netContents'],
    teach: 'Country is right, but the net contents were entered as 355 mL while the label is 440 mL (14.9 fl. oz.). A volume mismatch is a flag — request review.',
  },
  {
    label: 'BlackbeardCove', product: "Blackbeard's Cove — Spiced Rum", type: 'enter', isImport: false,
    values: { brandName: "Blackbeard's Cove", classType: 'Spiced Rum', abv: '40% Alc./Vol. (80 Proof)', netContents: '750 mL', producer: 'Produced & Bottled by Caribbean Imports, Miami, FL', countryOfOrigin: '' },
    answer: 'review', badFields: ['abv'],
    teach: 'The application states 40% (80 proof) but the label shows 35% (70 proof). Request review. (Note: "Caribbean Imports, Miami" is the bottler — this product is bottled domestically, so it is not treated as an import.)',
  },
  {
    label: 'LakesideMeadery', product: 'Lakeside Meadery — Traditional Mead', type: 'judge', isImport: false,
    values: { brandName: 'Lakeside Meadery', classType: 'Traditional Mead (Honey Wine)', abv: '12.0% VOL.', netContents: '750 mL', producer: 'Produced & Bottled by Lakeside Meadery, Minneapolis, MN', countryOfOrigin: '' },
    answer: 'review', badFields: ['netContents'],
    teach: 'Net contents were entered as 750 mL but the label is 500 mL. Request review.',
  },
  {
    label: 'IslandHeat', product: 'Island Heat — Flavored Vodka', type: 'enter', isImport: false,
    values: { brandName: 'Island Heat', classType: 'Coconut Flavored Rum', abv: '30% Alc./Vol. (60 Proof)', netContents: '750 mL', producer: 'Produced & Bottled by Sunshine Bottling Co., Orlando, FL', countryOfOrigin: '' },
    answer: 'review', badFields: ['classType'],
    teach: 'The application calls this "Coconut Flavored Rum", but the label is "Pineapple Flavored Vodka" — wrong flavor and wrong spirit. Request review.',
  },
  {
    label: 'PrairieDew', product: 'Prairie Dew — Apple Wine', type: 'judge', isImport: false,
    values: { brandName: 'Meadow Brook Cellars', classType: 'Apple Wine', abv: '11.0% VOL.', netContents: '750 mL', producer: 'Produced & Bottled by Prairie Dew Winery, Bismarck, ND', countryOfOrigin: '' },
    answer: 'review', badFields: ['brandName'],
    teach: 'The brand was entered as "Meadow Brook Cellars", but the label reads "Prairie Dew". Request review.',
  },
  {
    label: 'PacificCoastDistillers', product: 'Pacific Coast Distillers — Gin Liqueur', type: 'enter', isImport: false,
    values: { brandName: 'Pacific Coast Distillers', classType: 'Gin Liqueur', abv: '25% Alc./Vol. (50 Proof)', netContents: '750 mL', producer: 'Produced & Bottled by Pacific Coast Distillers, San Diego, CA', countryOfOrigin: '' },
    answer: 'approve', badFields: [],
    teach: 'All fields match, including the 25% / 50-proof gin liqueur. Approve.',
  },
  {
    label: 'VikingBlood', product: 'Viking Blood — Cherry Mead', type: 'judge', isImport: false,
    values: { brandName: 'Viking Blood', classType: 'Cherry Mead (Honey Wine with cherries)', abv: '13.5% VOL.', netContents: '750 mL', producer: 'Produced & Bottled by Heritage Meadery, Burlington, VT', countryOfOrigin: '' },
    answer: 'review', badFields: ['abv', 'netContents'], unreadable: true,
    teach: 'The entered values are actually correct — but the ABV and net contents are printed in gold on a dark background, which the offline reader can’t make out. That’s a "couldn’t read", not a mismatch. The right move is to request review (a clearer image, or the AI double-check on the single-label screen). Never approve a field the tool couldn’t actually read.',
  },
];

/** Each level gets its served image path derived from the label basename. */
export const LEVELS = RAW.map((l) => ({ ...l, image: IMG(l.label) }));

/** Field display names, shared with the UI. */
export const FIELD_LABELS = {
  brandName: 'Brand name', classType: 'Class / type', abv: 'Alcohol content',
  netContents: 'Net contents', producer: 'Producer / bottler', countryOfOrigin: 'Country of origin',
};

/** The two valid calls a learner can make. */
export const CALLS = Object.freeze({ APPROVE: 'approve', REVIEW: 'review' });

/** Did the learner make the right Approve/Request-review call on this level? */
export function isCorrectCall(level, call) {
  return call === level.answer;
}

/** For the optional "which field?" follow-up on a review call. */
export function isCorrectField(level, field) {
  return level.badFields.includes(field);
}
