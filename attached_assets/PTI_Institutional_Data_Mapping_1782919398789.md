# PTI vs. Institutional Credit Data — Mapping & Gap Analysis
**Longview Meridian Holdings | July 2026 | Internal Reference**

Purpose: map what banks, credit bureaus, alt-credit fintechs, BNPL, and telecom financing already use to underwrite, and identify what PagoYa/PagoSeguro can capture behaviorally as an equivalent or superior signal — before the next Replit build (fields 72–88).

---

## 1. Traditional Bureau (FICO) — Category Mapping

| FICO Category (weight) | What It Measures | PagoYa/PagoSeguro Equivalent |
|---|---|---|
| Payment history (35%) | On-time payment of credit accounts | `pr_score`, `advance_payment_days_avg`, `days_from_due`, `bills_missed_90d`, `cure_rate` — already stronger granularity than FICO (per-transaction vs. monthly tradeline) |
| Amounts owed (30%) | Credit utilization | No direct analog — PagoYa users don't carry revolving credit. Closest proxy: `wallet_load_to_bill_ratio`, `partial_payment_count` |
| Length of credit history (15%) | Account age/tenure | `platform_tenure_days`, `active_months` |
| New credit (10%) | Frequency of new credit inquiries | No analog — not applicable to bill-pay/rent context |
| Credit mix (10%) | Variety of credit types used | `biller_count_slope_90d`, cross-platform signal (field 76, once live) |

**Key gap in FICO that PTI already fills:** income is not a factor in any FICO/VantageScore model. `income_regularity_score` and `dominant_payday_window` are a genuine structural advantage — worth stating explicitly in investor materials as something bureaus structurally cannot do.

**Trended data (FICO 10T):** the newest FICO evolution moves toward 24-month trended payment patterns rather than a snapshot — directly validates the `pti_trend_30d/60d/90d` design already built into PTI.

---

## 2. Alt-Credit Fintechs Serving Unbanked Populations (Tala, Branch, JUMO)

| Their Data Point | Source | PagoYa/PagoSeguro Equivalent | Notes |
|---|---|---|---|
| Handset details, device type | Device fingerprint | `device_consistency_score`, `device_first_seen_at` | Already captured, internal-only |
| SMS logs, call logs | Phone metadata (invasive) | Not captured | Deliberately avoided — likely correct call given disclosure/trust positioning |
| GPS / location data | Phone sensor | `colonia`, `colonia_label` | You use validated neighborhood, not continuous GPS — less invasive, still useful for clustering |
| Contact lists / social graph | Phone contacts | `social_score`, referral chain data | Same underlying signal (network effects), captured with consent via referral system rather than contact-list scraping |
| App usage patterns | Device telemetry | `login_streak_days`, `financial_curiosity_index`, Paula engagement fields | Captured via your own app, not device-wide scraping |
| Mobile wallet activity | Telco/MNO partnership | `oxxo_load_count`, `card_load_count`, wallet transaction history | Direct equivalent, arguably richer since it's transaction-level |

**Takeaway:** PagoYa's signal set already covers most of what Tala/Branch/JUMO capture — without the privacy-invasive device-scraping approach (SMS, call logs, raw GPS, contact lists). This is a positioning strength, not a gap: it supports a "consent-first, transaction-native" narrative against competitors who lean on more invasive smartphone surveillance. Worth keeping as a deliberate differentiator rather than closing this "gap."

---

## 3. BNPL Underwriting Standards

| Regulatory/Industry Requirement | PagoYa/PagoSeguro Equivalent |
|---|---|
| Assess income and indebtedness | `income_regularity_score`, `monthly_bill_obligations`, `wallet_load_to_bill_ratio` |
| Track short-term repayment behavior (pay-in-4 cycles) | `payment_amount_volatility`, `partial_payment_count`, `days_from_due` |
| Trended/behavioral scoring emerging as standard (FICO incorporating BNPL data into scores) | Already core to PTI design |

**Caution flag:** newer BNPL regulation (NY DFS, 2026) explicitly **prohibits using a consumer's social network to set credit availability or pricing**. This is directly relevant to proposed field #82 (`referral_network_risk_correlation`). Not a reason to abandon it — colonia/referral clustering is a legitimate signal — but worth having Julio review before it's used in any partner-facing pricing/eligibility decision, versus purely internal risk modeling.

---

## 4. Telecom / Device Financing Underwriting

| Telecom Credit Data Point | PagoYa/PagoSeguro Equivalent |
|---|---|
| SIM activation tenure | `platform_tenure_days` |
| Postpaid payment/default history | Core PTI payment fields |
| Bill payment channel & mode (bank/credit/wallet) | `channel` field (wallet_balance vs. card_direct) |
| Calling behavior patterns → derived risk correlation | No direct analog — deliberately not pursued (see Section 2) |
| Separate telecom-specific score scale (400–900, distinct from FICO 300–850) | Validates PTI's dual-scale design (0–100 consumer / 350–850 B2B) |

---

## Summary: Where PTI Stands

**Already at or above institutional parity:** payment timing/regularity, income regularity, tenure, engagement depth, wallet/channel behavior, trend vectors.

**Structurally ahead of bureaus:** income visibility, transaction-level (not monthly-tradeline) granularity, real-time trending vs. quarterly snapshots.

**Deliberately not pursued (by design, not oversight):** device-wide SMS/call-log scraping, raw continuous GPS, contact-list mining. These are inputs invasive alt-credit competitors use — recommend keeping this as a stated differentiator ("consent-first alternative data," not "we collect everything you do") rather than treating it as a gap to close.

**One item needing legal review before build:** `referral_network_risk_correlation` (field 82) — proceed with schema/internal modeling, but flag for Julio before any partner-facing use in pricing or eligibility, given tightening regulatory treatment of social-graph-based credit decisions.
