---
name: Demo video architecture
description: 13-scene bilingual video structure, brand colors, scene mapping, and revenue model correctness
---

## Scene mapping (VideoTemplate.tsx SCENE_COMPONENTS)
scene1 → ScenePaula (WhatsApp opening — Paula agent)
scene2 → Scene2 (market stats — $40B / 54M / 45min)
scene3 → Scene3 (PagoYa intro — "Pay in 2 minutes")
scene4 → Scene4 (natural language input)
scene5 → Scene5 (AI autocomplete — 4 fields)
scene6 → Scene6 (funding channels — OXXO / Stripe Live / SPEI soon)
scene7 → SceneGiftCards (9 brands, PIN via WhatsApp, $2.8B market)
scene8 → Scene7 (WhatsApp receipt — "comprobante al instante")
scene9 → ScenePaulaTools (7 live tools grid)
scene10 → Scene10 (business model — correct numbers)
scene11 → Scene11 (why now — mobile-first / WhatsApp OS / AI cost)
scene12 → SceneStreetTeam (community model — $5/payment, 7-day hold)
scene13 → Scene13 (closing — live tiles + YC tags)

## Total duration: 173s (< 3 min)

## Brand colors (June 2026)
- Primary bright: #00C875
- Primary dark: #007A4A
- Background: #071C2E
- Orange accent: #E8631A
- Old color #1D9E75 replaced everywhere

## Bilingual (EN/ES)
- LangContext.tsx at lib/video/LangContext.tsx
- LangProvider wraps everything inside VideoTemplate
- lang state ('es' default) lives in VideoWithControls
- EN/ES toggle button in ControlBar (pill with #00C875 active bg)
- All 13 scenes use useLang() hook

## Revenue model (Scene10 — correct as of June 2026)
- Bill pay fee: $25 MXN (~$1.35 USD) per transaction
- Gift card margin: ~40% wholesale spread
- PagoSeguro: 2.75% brokerage (coming soon)
- LTV: $900+ MXN, CAC: ≈$0 (street team 7-day hold), LTV/CAC: ∞

**Why:** Previous Scene10 had wrong numbers ($15 MXN, $49 loyalty, B2B white-label) that don't reflect the real business.

## Persistent phone mockup
Shows only for scenes at index 3, 4, 5 (scene4=natural language, scene5=autocomplete, scene6=funding).
ScenePaula (scene1) has its own WhatsApp mockup — no overlap needed.
