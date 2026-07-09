# WS4 — Analytics: Cloudflare, GA4, and Baseline Snapshot
_Prepared July 9, 2026. For Lloyd. All data below is pasted from production queries._

## 4.1 Cloudflare (Lloyd executes — Agent has no CF access)

Log in at dash.cloudflare.com → select the `pagoyamx.com` zone, then:

1. **Bot Fight Mode** — Security → Bots → toggle **Bot Fight Mode** ON.
   (Free plan; blocks known bad bots. Do NOT enable "Super Bot Fight Mode" JS challenge on
   `/api/*` paths — it can break the Twilio/Conekta webhooks. If prompted for path rules,
   exclude `/api/*`.)
2. **Browser Integrity Check** — Security → Settings → **Browser Integrity Check** ON.
3. **Security Level** — Security → Settings → set to **Medium** (not "I'm Under Attack" —
   that interstitial breaks webhook POSTs).
4. **Caching** — Caching → Configuration → confirm **Standard**. Add a Cache Rule:
   `pagoyamx.com/pagar-*` → Eligible for cache, Edge TTL 2 hours (these are static
   landing pages; faster loads help SEO).
5. **Verify webhooks still work after enabling**: send a WhatsApp message to Paula and
   confirm a reply; that exercises the Twilio webhook path end-to-end.

## 4.2 GA4 — separating real users from ourselves

GA4 property → Admin (gear icon):

1. **Internal traffic filter**
   - Admin → Data Streams → (web stream) → Configure tag settings → Show all →
     **Define internal traffic** → Create → condition: IP address *equals* your IP
     (get it at whatismyip.com). Add one rule per person (Lloyd, Eng, street reps' homes).
   - Then Admin → Data Settings → **Data Filters** → `Internal Traffic` → set from
     *Testing* to **Active**. (Until it's Active, the filter tags but does not exclude.)
2. **Developer traffic**: dev/preview URLs (`*.replit.dev`) — Admin → Data Filters →
   Create filter → Developer traffic → Active. Also add a filter or segment excluding
   hostname != `pagoyamx.com` in Explorations.
3. **Real-user segment for reports**: Explore → create segment `Usuarios reales` =
   hostname exactly `pagoyamx.com` AND exclude internal/developer traffic.
4. **Referral check (chatgpt.com line)**: Reports → Acquisition → Traffic acquisition →
   search "chatgpt" in the source/medium table. Baseline this weekly.

## 4.3 Baseline snapshot — production, July 9, 2026

Source: prod `users` ⟕ `wallets`, payment count from `bill_payments`.

| Phone (last 4) | Name | Signup date | Source | Consent | Balance MXN | Bill payments |
|---|---|---|---|---|---|---|
| 0001 | (test row) | May 8 | — | no | 0.00 | 0 |
| 4213 | (test row) | May 15 | — | no | 500.00 | 0 |
| 2483 | William Cameron Shaw | Jun 11 | whatsapp_organic | **yes** | 150.00 | 0 |
| 9799 | Leticia Alejandra Pizano Rios | Jun 11 | whatsapp_organic | **yes** | 150.00 | 0 |
| 6528 | Tina Torres | Jun 11 | whatsapp_organic | **yes** | 150.00 | 0 |
| 2382 | — | Jun 25 | web_organic | no | 150.00 | 0 |
| 3105 | — | Jun 30 | web_organic | no | 150.00 | 0 |
| 1695 | — | Jun 30 | web_organic | no | 150.00 | 0 |
| 8514 | — | Jul 6 | web_organic | no | 150.00 | 0 |

**Funnel read (7 real users):**
- Registered: 7 · WhatsApp-consented: 3 (the Jun 11 WhatsApp cohort) · Bonus credited: 7/7 ($150 each, D1 backfill verified)
- Bill payments completed: **0** — activation, not acquisition, is the current bottleneck.
- `colonia` is empty for all real users → colonia capture/backfill needs a follow-up before geo segmentation is possible.
- Landing-page attribution (`users.landing_page`) goes live with this release; all future
  web signups will record which page (e.g. `/pagar-cfe-monterrey`) brought them in.
  Expect NULL for all existing rows.

**Weekly cadence suggestion:** every Monday pull this same table + GA4 `Usuarios reales`
sessions by landing page + chatgpt.com referral count.
