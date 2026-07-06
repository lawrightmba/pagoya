# PTI Signal Expansion: Gap Analysis & Roadmap
### Behavioral credit predictors research → v4.x input expansion for API licensing
*Prepared July 2026 · Companion to PTI v4.2 (39 inputs / 41 signals) and PTI_SeriesA_ARR_Model.xlsx*

---

## 1. What the research actually says is predictive

The academic and applied literature converges on five signal families, ranked here by evidence strength and relevance to an owned-rail architecture like PagoYa's.

**1. Cash-flow behavior (strongest evidence, lowest fair-lending risk).** FinRegLab's multi-year studies (Charles River Associates, loan-level data from Accion, Oportun, Petal, LendUp, Brigit, Kabbage) found cash-flow variables and scores at least as predictive as traditional bureau scores, with the critical finding that cash-flow features held predictive value *across demographic groups rather than acting as proxies for group membership*. Their 2025 follow-up found ML models combining cash-flow data were the most predictive overall and across all subgroups. This is the single most important research anchor for PTI — it is both a predictiveness citation and a fair-lending defense citation.

**2. Payment mechanics micro-structure (Björkegren & Grissen, World Bank WP 9074).** From raw telecom transaction records they extracted ~5,500 behavioral indicators; top-quintile-risk individuals were 2.8x more likely to default than bottom-quintile, and the model outperformed bureau scores on thin-file borrowers. The key insight for PTI: the predictive power came not from *what* people did but from the *shape* of behavior over time — usage smoothness (careful balance management), monthly cyclicality (income regularity), and reciprocity (whether calls get returned). PTI's 39 inputs are mostly levels and counts; the literature says the derivatives — variance, regularity, recovery — carry the signal.

**3. Digital footprint context signals (Berg, Burg, Gombović & Puri, RFS 2020).** Simple variables captured passively at registration/login — device type, email provider, time-of-day of activity, whether the user typed their name correctly — matched the information content of bureau scores (bureau-only AUC 68.3%; footprint comparable; combined higher), with equal discriminatory power for unscorable customers. Relevant but **handle with care**: several of these (device tier, digital sophistication markers) are exactly the income-proxy class your synthetic stress test flagged.

**4. Recharge/load regularity (airtime credit literature).** Multiple studies (incl. Shema 2019, ICTD) show accurate credit models can be trained on airtime recharge data *alone* — regularity and consistency of top-ups predicting repayment — and note this is *less privacy-invasive* than full phone-metadata approaches. Direct analog: wallet load behavior. This is the M-Shwari playbook — its limits are set from savings history, transaction patterns, and repayment track record on the rail it owns.

**5. Financial-literacy engagement / psychometric proxies (LenddoEFL lineage).** Engagement with financial education content and demonstrated planning behavior proxy conscientiousness, the most robust psychometric predictor of repayment. Paula's Module 1–5 curriculum already generates this — but it currently only gates, it doesn't score at granularity.

---

## 2. Audit: where the current 39 inputs are shallow

The v4.2 structure (Payment Reliability 30 / Cash Flow 25 / Engagement Depth 25 / Biller Consistency 20, dual output, cold-start, 30/60/90 trends) is sound. The gap is not the dimension architecture — it's that most inputs are **levels and counts** where the research says the signal lives in **distributions, derivatives, and responses to stress**.

### Payment Reliability (30%) — deepest upgrade opportunity
Current inputs capture *whether* payments happen on time. Missing:

- **Days-to-due-date distribution, not average.** A user who pays 3±1 days early is a fundamentally different risk than one who averages 3 days early with a ±9-day spread. Variance is the signal; the mean is noise. (Björkegren's "smoothness" finding, applied to payment timing.)
- **Cure/recovery metrics.** Time-to-cure after a missed or late payment. A user who misses and repairs within 48 hours is behaviorally distinct from one who never misses *and* from one who misses and drifts. Resilience is a separate construct from reliability and the current inputs can't see it.
- **Pre-due balance staging.** Does the user load the wallet N days before a known bill due date? This is observable planning behavior — the strongest conscientiousness proxy available from pure transaction data, and it's income-neutral (planning ≠ having money).
- **Sequencing under scarcity.** When wallet balance can't cover all pending bills, which bill gets paid first — and is that priority ordering *stable* across scarcity events? Priority stability under constraint is a discipline signal no competitor in your SWOT set can observe, because none of them owns the payment rail.
- **Bill-shock response.** When a bill amount spikes (CFE summer bill), does the user pay full, pay partial, pay late, or go silent? The bill spike is exogenous; the response is pure behavioral signal.

### Cash-Flow Stability (25%) — second-deepest
- **Balance time-series features:** minimum balance maintained between loads (buffer behavior), days-at-zero per month, drawdown velocity after each load. Buffer-keeping is the wallet-native version of the savings behavior M-Shwari scores.
- **Load regularity:** inter-load interval entropy and load-amount coefficient of variation. The airtime literature shows recharge regularity alone supports a viable model.
- **Load-to-obligation precision:** ratio of loaded amount to known upcoming bill total. "Precision loaders" (load exactly what's due) vs "surplus loaders" (load and hold) are distinct behavioral types.
- **Quincena alignment index (Mexico-specific, use cautiously):** whether loads/payments align to the 15th/30th quincenal pay cycle. High-granularity income-cadence inference — genuinely predictive per Björkegren's cyclicality finding, but it is close to a formal-employment proxy. Build it, log it, keep it out of computePTI until Dr. Franklin's framework can test it. The source-scan isolation guard gives you a clean place to park signals in "collected, not scored" status.

### Behavioral Consistency (25%) — upgrade the mechanics, not the volume
- **Inter-login interval regularity (entropy), not login count.** Frequency is income-correlated (smartphone data plans, free time); *rhythm* is less so.
- **Paula response-latency distribution** (median + variance) — paula_inbound_log already has the timestamps. Zero new collection.
- **Nudge-independence trend:** ratio of self-initiated to nudge-triggered payments over time. Rising self-initiation = habit formation = the exact construct lenders pay for. Also a beautiful reason-code narrative ("pays without reminders").
- **Streak repair rate:** of broken streaks, what fraction get re-established within 30 days.

### Engagement Depth (25%) — ⚠ freeze expansion here
This dimension is where the disparate-impact finding lives. Engagement depth (device tenure, biller diversity, KYC completion, Paula chat volume) is the signal family most confounded with income in the literature — it's Berg et al.'s device/sophistication finding wearing a different shirt. Your own 8,000-profile stress test surfaced 7–8 income-correlated proxies with a four-fifths ratio around 0.045; adding *more* engagement signals before the fair-lending layer is redesigned would compound the problem you already know the ±5/±2 adjustment layer can't close.

Two exceptions worth adding because they're knowledge-based rather than access-based:
- **Literacy module quiz performance and completion velocity** — knowledge demonstration, the EFL psychometric analog, defensible as a scored input.
- **Biller *category* diversity, not biller count.** CFE + Telmex + rent is a different life-infrastructure profile than three telco top-ups. Category mix is less income-proxying than raw count (adding billers costs money; categorizing existing ones doesn't).

### Biller Consistency (20%)
- **Per-biller tenure and retention** (relationship duration per biller, not just diversity snapshot).
- **Biller-payment interval stability per relationship** — same regularity math as loads, per biller.

---

## 3. The single highest-ROI move: temporal derivative features

Björkegren extracted 5,500 features from one data type by computing distributional summaries. PTI can do the same transformation on data already in Postgres:

For every existing time-stamped input, compute: **rolling volatility** (30/60/90-day std dev), **velocity** (first difference of the 30-day mean), **trend-break flags** (regime change detection), and **regularity/entropy** (predictability of inter-event intervals).

This turns 39 raw inputs into roughly 150–200 model-ready features with **zero new data collection, zero new consent surface, zero schema changes to capture paths** — it's all read-side computation in the pure engine's snapshot builder. It also materially improves cold-start: a volatility estimate stabilizes in 4–6 weeks of activity, versus the months required for streak- and tenure-based signals to become meaningful. Faster time-to-scoreable-user is itself a valuation metric (see §6).

Because computePTI is a pure function over a snapshot, this lands as (a) a snapshot-builder expansion in the DB wrapper and (b) new deterministic feature math in the engine — fully compatible with your synthetic stress-test harness, which is exactly where each new feature family should be ablation-tested before weighting.

---

## 4. What NOT to add (and why this is a selling point, not a limitation)

The alt-data industry's expansion path — device metadata harvesting, contact-list analysis, SMS inbox scraping, app-inventory scans, geolocation trails, social-media footprints — is available and predictive per the vendor literature (CredoLab et al.). Recommend **explicitly declining all of it**, for four reasons that compound:

1. **Consent surface.** These are new data-collection classes under LFPDPPP requiring expanded aviso de privacidad and, for several, fresh affirmative consent — breaking the "first-party behavioral exhaust from a service the user already chose" posture that keeps PTI clean. (Verify the boundary with Julio, but app-generated transactional/interaction data under the existing aviso is a very different animal from reading a user's SMS inbox.)
2. **Regulatory moat integrity.** The Banxico carve-out narrative ("predictive indicators of payment capacity," outside SIC authorization) is strongest when every input is payment-capacity-adjacent. Contact graphs and app inventories invite the question "isn't this just a shadow credit report?" — the exact reclassification risk the regulatory memo needs to foreclose.
3. **Fair-lending exposure.** Device tier, app inventory, and digital-sophistication signals are the canonical income/wealth proxies. You'd be importing more of the problem the stress test already quantified.
4. **Diligence optics.** "We deliberately built the most predictive model possible from the narrowest, most consent-clean data surface" is a differentiated Series A position. Phone-scraping alt-data is a crowded, reputationally-decaying category; owned-rail behavioral data is not.

The one-sentence version for the deck: *PTI's data advantage is depth-per-user on an owned rail, not breadth-of-surveillance.*

---

## 5. Prioritized build list

**P0 — Derivative feature layer (1–2 weeks, pure engine + snapshot builder)**
Volatility/velocity/regularity/entropy transforms over existing inputs. Ablation-test via the synthetic harness. No consent, no schema, no new capture. Do this before the Dr. Franklin re-engagement so the bias testing covers the expanded feature set once, not twice.

**P0 — Payment-timing distribution features (days 1–3 of the above)**
Due-date-relative timing mean+variance, cure time, pre-due staging index. Computable from existing payment + bill records.

**P1 — Cash-flow micro-structure (1–2 weeks)**
Balance buffer, days-at-zero, drawdown velocity, load regularity/CV, load-to-obligation ratio. Reads wallet_transactions + bill schedule.

**P1 — Paula interaction mechanics (3–5 days)**
Response-latency distribution, nudge-independence ratio, literacy quiz granularity. Reads paula_inbound_log / paula_send_queue / readiness_assessments. *Blocked in production value terms by the message_templates prod gap — no outbound nudges means no nudge-response data; the bug-sweep fix is upstream of this signal family.*

**P1 — Sequencing-under-scarcity + bill-shock response (1 week)**
Requires event detection logic (scarcity events, bill spikes) but no new capture.

**P2 — Collected-not-scored quarantine tier**
Quincena alignment, load-channel formality mix, session time-of-day concentration. Log them, exclude from computePTI via the isolation-guard pattern, hand the corpus to Dr. Franklin as the test set for the redesigned fairness framework. Signals graduate into scoring only with signoff — this also gives the three-state signoff system real work to do.

**P2 — Biller relationship features**
Per-biller tenure/retention/interval stability. Low effort, low urgency at current biller counts.

---

## 6. Valuation mechanics: how this moves the raise

What actually prices a pre-seed/Series A data-infrastructure company in this category:

**Signal density per user per month.** Post-P0/P1, the honest claim moves from "39 behavioral inputs" to on the order of **150+ proprietary behavioral signals per active user, refreshed nightly, from an owned payment rail** — a categorically different data-asset statement. Neither Destácame (self-reported utility data, no owned rail), Nova Credit (bureau passporting, zero behavioral), nor the Buró/Círculo duopoly (repayment outcomes only, no pre-credit behavior) can make it. This directly reinforces the SWOT conclusion that nobody owns Mexico-domestic-unbanked-behavioral.

**Time-to-scoreable-user.** Derivative features compress cold-start from months to weeks. This is Scenario A's canary metric ("% of users with enough history for a usable score") — the feature expansion literally improves your own pre-mortem's leading indicator.

**Cross-group validity by design.** Prioritizing cash-flow and payment-mechanics families — the ones FinRegLab found predictive *without* proxying demographics — while quarantining income-adjacent signals behind the signoff gate converts the disparate-impact finding from a diligence liability into a governance-maturity exhibit. Very few pre-Series A alt-data companies can show a proxy-variable stress test, an isolation guard, and a quarantine tier. That's an institutional-investor story.

**The honest constraint.** With 11 soft-launch users and 3 wallet transactions, an expanded feature list is a specification, not a validated asset — investors will discount claimed predictiveness to zero without outcome data. The feature expansion becomes valuation-real through the **retrospective backtest** (Compartamos / Kubo / Konfío path). Design implication: define every P0/P1 feature with a rail-agnostic abstraction (e.g., "obligation-relative payment timing variance" rather than "PagoYa bill timestamp delta") so the backtest on an MFI's historical book validates the *feature family*, producing a citable AUC/Gini against Buró scores. That single number — "PTI feature set achieves AUC of X vs bureau baseline Y on Z thousand historical loans" — is worth more to the $8–20M pre-money target than any amount of feature count. Sequencing: ship P0 derivatives → reason codes (already Tier 1) → backtest partner data-spec built from this feature list → Dr. Franklin fairness pass over the same feature set.

**Research citations for the data-room memo:** FinRegLab/CRA cash-flow underwriting series (2019, 2025); Berg, Burg, Gombović & Puri, *RFS* 33(7) 2020; Björkegren & Grissen, World Bank Policy Research WP 9074 / *AEA* 2018; Shema (ICTD 2019) on recharge-only scoring; M-Shwari as the owned-rail precedent at scale.

---

## 7. Summary of net-new data points (quick reference)

| # | Signal | Dimension | New capture? | Fair-lending risk | Priority |
|---|--------|-----------|--------------|-------------------|----------|
| 1 | Payment-timing variance (due-date-relative) | Reliability | No | Low | P0 |
| 2 | Time-to-cure after miss | Reliability | No | Low | P0 |
| 3 | Pre-due balance staging index | Reliability | No | Low | P0 |
| 4 | Sequencing-under-scarcity stability | Reliability | No | Low | P1 |
| 5 | Bill-shock response type | Reliability | No | Low | P1 |
| 6 | Rolling volatility/velocity on all 39 inputs | All | No | Low–Med (test per feature) | P0 |
| 7 | Balance buffer / days-at-zero / drawdown velocity | Cash Flow | No | Low | P1 |
| 8 | Load interval entropy + amount CV | Cash Flow | No | Low | P1 |
| 9 | Load-to-obligation precision ratio | Cash Flow | No | Low | P1 |
| 10 | Paula response-latency distribution | Consistency | No | Medium | P1 |
| 11 | Nudge-independence trend | Consistency | No | Low | P1 |
| 12 | Streak repair rate | Consistency | No | Low | P1 |
| 13 | Literacy quiz performance/velocity | Engagement | No | Medium | P1 |
| 14 | Biller category mix (vs count) | Engagement | No | Medium | P2 |
| 15 | Per-biller tenure/retention | Biller Consistency | No | Low | P2 |
| 16 | Quincena alignment index | Cash Flow | No | **High — quarantine** | P2 (collected-not-scored) |
| 17 | Load channel formality mix | Cash Flow | No | **High — quarantine** | P2 (collected-not-scored) |
| 18 | Session time-of-day concentration | Consistency | No | **High — quarantine** | P2 (collected-not-scored) |
| — | Device metadata, contacts, SMS, geolocation, app inventory, social | — | Yes | Severe | **Do not build** |

Every recommended signal is computable from tables PagoYa already writes. The entire expansion is a read-side and pure-engine project — consistent with the computePTI architecture, testable in the synthetic harness, and inside the existing LFPDPPP consent perimeter (pending Julio's confirmation on the aviso de privacidad scope).
