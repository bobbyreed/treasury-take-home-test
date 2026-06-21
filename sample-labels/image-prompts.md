# Image-generation prompts (controlled label set)

25 prompts, one per profile in
[`ai-generated/labelIdeas.md`](./ai-generated/labelIdeas.md).

**Strategy:** these target the *core happy path* — a label that **fills the
frame**, flat and straight-on (like a scan), with every required field legible.
That's the opposite of the photorealistic bottle-in-a-scene renders, where the
label is ~10% of the image and OCR chokes. Messy/scene images are a separate,
stretch "robustness" set (the brief flags them as likely out of scope, with
"reject and request a better image" as an acceptable fallback).

## How to use

Paste the **STYLE block** + the **WARNING block** + one numbered prompt into the
image generator (one at a time). Image models often garble long text — keep the
renders where the text (especially the warning) came out clean; the imperfect
ones make honest robustness samples. Save outputs into
`sample-labels/ai-generated/<tool>/` and we'll pair them to expected values via
`expected-values.csv`. For the degraded twin of each label, swap the STYLE block
for the **DISTORTED STYLE block** below (same WARNING block and numbered prompt)
— giving 25 clean + 25 distorted matched pairs.

---

### STYLE block (prepend to every prompt)

> Design a flat, front-facing **printed alcohol-beverage label that FILLS THE
> ENTIRE FRAME** — a rectangular paper label shown perfectly straight-on, as if
> flat-scanned: no bottle, no can, no hands, no background scene, no perspective,
> no curvature. Even studio lighting, no glare, sharp focus, high resolution.
> Render **all text crisply and exactly as written** (spelling, punctuation,
> capitalization, and the alcohol-content format). Use tasteful, realistic
> label typography and layout appropriate to the product. Include every text
> element listed. Render the Government Health Warning in small but fully legible
> type, with the lead-in **"GOVERNMENT WARNING:" in bold UPPERCASE**.

### WARNING block (include verbatim on every label)

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not
> drink alcoholic beverages during pregnancy because of the risk of birth
> defects. (2) Consumption of alcoholic beverages impairs your ability to drive a
> car or operate machinery, and may cause health problems.

### DISTORTED STYLE block (alternative — for the degraded "real-world" pair)

Use this **instead of** the STYLE block (keep the same WARNING block and the same
numbered prompt) to generate a degraded twin of the same label — for testing the
"reject and request a better image" / low-confidence path and robustness.

> Show this exact label as a **real-world phone photo taken in poor conditions**,
> not a clean scan. The label is on or around a bottle or can. Keep all the same
> text content, but capture it imperfectly: pick **two or three at random** from —
> photographed at an **angle / perspective tilt** (roughly 10–35°); the label
> **curved** around the bottle; **glare or a bright specular reflection** across
> part of it; **dim, uneven, or harsh side lighting** with shadows; **slight
> motion or out-of-focus blur**; **off-center framing** with part of an edge
> cropped; a **hand or cluttered background** partly visible. Vary the combination
> each time. The text should stay *mostly legible to a human* but clearly harder
> to read than the clean version. Make it a realistic, natural photo — not
> stylized.

---

## Wine

**1. Silver Creek Vineyard — Reserve Cabernet Sauvignon**
Refined Napa estate aesthetic: cream/ivory stock, engraved vineyard crest, classic serif.
Text: `Silver Creek Vineyard` · `Reserve` · `Cabernet Sauvignon` · `14.8% VOL.` · `750 mL` · `Produced & Bottled by Silver Creek Vineyard, St. Helena, CA` · `2019` · [Government Health Warning].

**2. Château de la Roche — Sancerre (White Wine), imported**
Classic French château style: pale label, line-engraving of a château, elegant serif.
Text: `Château de la Roche` · `Sancerre (White Wine)` · `12.5% VOL.` · `750 mL` · `Product of France. Bottled by Vignoble Imports, New York, NY` · `FRANCE` · [Government Health Warning].

**3. Red Barrel Cellars — Cranberry Sparkler**
Festive, casual: deep red and gold, playful rounded type.
Text: `Red Barrel Cellars` · `Cranberry Sparkling Wine` · `9.0% VOL.` · `750 mL` · `Carbonated, Produced & Bottled by Red Barrel Cellars, Traverse City, MI` · [Government Health Warning].

**4. Pacific Coast Vintners — Estate Chardonnay**
Clean modern coastal: soft blue/gold, sans-serif with a thin serif accent.
Text: `Pacific Coast Vintners` · `Chardonnay` · `Central Coast` · `13.5% VOL.` · `750 mL` · `Cellared & Bottled by Pacific Coast Vintners, Lompoc, CA` · [Government Health Warning].

**5. Cider House Rules — Dry Apple Cider**
Rustic orchard: kraft-paper tone, apple motif, hand-drawn type.
Text: `Cider House Rules` · `Hard Apple Cider` · `6.5% VOL.` · `355 mL (12 fl. oz.)` · `Produced & Bottled by Cider House Rules, Hood River, OR` · [Government Health Warning].

## Distilled spirits

**6. Old Tom Distillery — Kentucky Straight Bourbon Whiskey**
Heritage bourbon: amber/black, bold condensed serif, ornate border.
Text: `Old Tom Distillery` · `Kentucky Straight Bourbon Whiskey` · `Aged 5 Years` · `45% Alc./Vol. (90 Proof)` · `750 mL` · `Distilled & Bottled by Old Tom Distillery, Lexington, KY` · [Government Health Warning].

**7. Blue Sky Distilling — Premium Vodka**
Clean minimalist: white/ice-blue, tall modern sans-serif.
Text: `Blue Sky Distilling` · `Vodka` · `40% Alc./Vol. (80 Proof)` · `1 L` · `Distilled & Bottled by Blue Sky Distilling, Denver, CO` · [Government Health Warning].

**8. Juniper Grove — Botanical Gin**
Botanical apothecary: sage green, line-art juniper/lavender, refined serif.
Text: `Juniper Grove` · `Distilled Gin` · `43% Alc./Vol. (86 Proof)` · `750 mL` · `Distilled by Juniper Grove Distilling, Golden, CO. Bottled for Alpine Spirits, Boulder, CO` · [Government Health Warning].

**9. Río Azul Spirits — Añejo Tequila, imported**
Premium agave: warm cream and cobalt, agave motif, elegant display type.
Text: `Río Azul Spirits` · `Añejo Tequila` · `40% Alc./Vol. (80 Proof)` · `750 mL` · `Distilled by Río Azul Spirits, Tequila, Jalisco, Mexico. Imported by Golden Eagle Imports, San Antonio, TX` · `MEXICO` · [Government Health Warning].

**10. Smoky Mountain — Moonshine (Corn Whiskey)**
Rustic mason-jar: cream label, woodcut mountains, stamped type.
Text: `Smoky Mountain` · `Corn Whiskey` · `50% Alc./Vol. (100 Proof)` · `375 mL` · `Distilled & Bottled by Smoky Mountain Distillery, Gatlinburg, TN` · [Government Health Warning].

**11. Highland Cask — 12-Year Blended Scotch Whisky, imported**
Traditional Scotch: deep green and gold, tartan accent, engraved serif.
Text: `Highland Cask` · `Blended Scotch Whisky` · `Aged 12 Years` · `43% Alc./Vol. (86 Proof)` · `750 mL` · `Distilled, Blended & Bottled in Scotland. Imported by Albion Spirits, Boston, MA` · `SCOTLAND` · [Government Health Warning].

**12. Blackbeard's Cove — Spiced Rum**
Nautical/pirate: weathered parchment, rope border, bold slab serif.
Text: `Blackbeard's Cove` · `Spiced Rum` · `35% Alc./Vol. (70 Proof)` · `750 mL` · `Produced & Bottled by Caribbean Imports, Miami, FL` · `Product of Guyana & Jamaica` · [Government Health Warning].

## Beer / malt

**13. Mountain Peak Brewing — West Coast IPA**
Bold craft-can art: teal/orange, angular mountains, heavy sans-serif.
Text: `Mountain Peak Brewing` · `India Pale Ale (IPA)` · `7.2% Alc./Vol.` · `12 FL. OZ. (355 mL)` · `Brewed & Canned by Mountain Peak Brewing, Denver, CO` · [Government Health Warning].

**14. Golden Harvest — Farmhouse Ale / Saison**
Rustic Belgian farmhouse: wheat tones, wheat-sheaf motif, vintage serif.
Text: `Golden Harvest` · `Farmhouse Ale / Saison` · `6.0% Alc./Vol.` · `1 PINT 6 FL. OZ. (750 mL)` · `Brewed & Bottled by Golden Harvest Brewery, Portland, OR` · [Government Health Warning].

**15. City Center Brewery — Light Lager**
Industrial mass-market: silver/blue, clean geometric sans-serif.
Text: `City Center Brewery` · `Light Lager` · `4.2% Alc./Vol.` · `12 FL. OZ. (355 mL)` · `Brewed & Canned by City Center Brewery, Milwaukee, WI` · [Government Health Warning].

**16. Old Port Brewery — Irish Dry Stout, imported**
Classic Irish stout: black/cream, harp motif, traditional serif.
Text: `Old Port Brewery` · `Stout` · `4.3% Alc./Vol.` · `14.9 FL. OZ. (440 mL)` · `Product of Ireland. Brewed by Old Port Brewery, Dublin, Ireland. Imported by Global Beverage Partners, New York, NY` · `IRELAND` · [Government Health Warning].

**17. The Mad Scientist — Barrel-Aged Imperial Stout**
Quirky premium: dark label, beaker/lab motif, hand-lettered display type.
Text: `The Mad Scientist` · `Imperial Stout` · `13.5% Alc./Vol.` · `16 FL. OZ. (473 mL)` · `Brewed, Aged & Canned by Mad Scientist Brewery, Atlanta, GA` · [Government Health Warning].

**18. Lakeside Meadery — Traditional Mead**
Warm honey aesthetic: gold/amber, honeycomb texture, calligraphic serif.
Text: `Lakeside Meadery` · `Traditional Mead (Honey Wine)` · `12.0% VOL.` · `500 mL` · `Produced & Bottled by Lakeside Meadery, Minneapolis, MN` · [Government Health Warning].

## Specialty & non-traditional

**19. The Spicy Badger — Habanero Mead**
Bold and fiery: orange/black, badger mascot, energetic type.
Text: `The Spicy Badger` · `Habanero Mead` · `14.5% VOL.` · `375 mL` · `Produced & Bottled by Spicy Badger Meadery, Phoenix, AZ` · [Government Health Warning].

**20. Prairie Dew — Apple Wine**
Soft pastoral: pale green, prairie-grass line art, gentle serif.
Text: `Prairie Dew` · `Apple Wine` · `11.0% VOL.` · `750 mL` · `Produced & Bottled by Prairie Dew Winery, Bismarck, ND` · [Government Health Warning].

**21. Island Heat — Pineapple Flavored Vodka**
Tropical/neon: hot pink and teal, pineapple motif, playful display type.
Text: `Island Heat` · `Pineapple Flavored Vodka` · `30% Alc./Vol. (60 Proof)` · `750 mL` · `Produced & Bottled by Sunshine Bottling Co., Orlando, FL` · [Government Health Warning].

**22. High Desert — Mezcal Joven, imported**
Artisanal Oaxacan: earthy terracotta, agave woodcut, folk-art type.
Text: `High Desert` · `Mezcal Joven (100% Maguey Espadín)` · `42% Alc./Vol. (84 Proof)` · `750 mL` · `Product of Mexico. Bottled by Mezcal de Oaxaca, S.A. de C.V. Imported by Border Crossings Imports, El Paso, TX` · `MEXICO` · [Government Health Warning].

**23. Viking Blood — Cherry Mead**
Norse/historical: deep crimson, knotwork border, runic-styled display serif.
Text: `Viking Blood` · `Cherry Mead (Honey Wine with cherries)` · `13.5% VOL.` · `750 mL` · `Produced & Bottled by Heritage Meadery, Burlington, VT` · [Government Health Warning].

**24. Pacific Coast Distillers — Gin Liqueur**
Soft elegant: blush/silver, botanical filigree, light serif.
Text: `Pacific Coast Distillers` · `Gin Liqueur` · `25% Alc./Vol. (50 Proof)` · `750 mL` · `Produced & Bottled by Pacific Coast Distillers, San Diego, CA` · [Government Health Warning].

**25. Pioneer Cellars — Fortified Wine**
Vintage port: oxblood and gold, ornate frame, traditional serif.
Text: `Pioneer Cellars` · `Fortified Wine (Port style)` · `19.5% VOL.` · `750 mL` · `Produced & Bottled by Pioneer Cellars, Sonoma, CA` · [Government Health Warning].
