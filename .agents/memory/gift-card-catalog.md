---
name: Gift card catalog architecture
description: Structure, grouping taxonomy, and denomination principles for the gift card catalog
---

## Grouping taxonomy (purchase intent)
Three groups used in both Home.tsx (GIFT_CARD_GROUPS) and BillPaySelector CATEGORIES/SERVICES:
- **Entretenimiento** — Netflix, Spotify, Disney+, Max, Cinépolis, Google Play
- **Conveniencia** — Uber, Uber Eats, Amazon
- **Tiendas** — Liverpool, Soriana, Starbucks

**Why:** Different psychological triggers — Tiendas are planned/intentional purchases, Conveniencia is impulse/utility, Entretenimiento is aspiration/subscription. Grouping scales cleanly to 20+ brands.

## Data structure
- `Home.tsx`: `GIFT_CARD_GROUPS` — nested array of groups, each with `{id, labelEs, labelEn, emoji, brands[]}`. Renders three horizontal-scroll rows with group headers.
- `BillPaySelector.tsx`: `GIFT_CARD_DENOMINATIONS` record keyed by service id; `GIFT_CARD_SERVICE_IDS` Set for routing; category fields on SERVICES match group names.

## Denomination principles
- **Cinépolis**: ticket-aligned labels ("~1 boleto regular", "~1 boleto 3D", "~1 boleto IMAX", "~2 boletos regular", "~2 boletos 3D"). No sub-$100 denominations — below current Mexico ticket pricing.
- **Liverpool**: goes up to $5,000 MXN. Labels on high values: $3K = "Electrónica / Moda", $5K = "Electrodomésticos / TV". People buy TVs and appliances there.
- **Soriana**: up to $2,000 MXN ("Despensa grande") for large grocery runs.
- **Google Play**: $50–$500 — correct range, no changes needed.

## Currency
Entire app is MXN-only. No exchange rate logic needed. Three display patterns all correct by context: integer `$300 MXN` on denomination buttons, `.toFixed(2)` on payment confirmations, `toLocaleString("es-MX")` on balance widgets.

## Routing
Gift card services bypass the reference-number step entirely. `handleSelectService` checks `GIFT_CARD_SERVICE_IDS` → routes to denomination step → `handleSelectDenomination` sets `categoria: serviceId` (e.g. `netflix_300`) and navigates to `/revisar`. Bill pay services go to `/pagar` as before.
