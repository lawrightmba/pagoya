PagoYa — Data Signal Inventory (Addendum)
Fields 72–88 · Predictive Trust Index expansion · July 2026 · Confidential
Scope: PagoYa only. Built against existing PagoYa data surfaces — no PagoSeguro/MAHALI dependency.

Remittance & Diaspora Income Signals
4 signals — new capture, linked to wallet_load transactions

# Field Description Status
72 remittance_inflow_regularity_score CV-derived regularity of inbound USD/remittance-linked loads (0–100) Proposed
73 avg_remittance_amount_mxn Avg MXN value of remittance-linked wallet loads Proposed
74 remittance_source_consistency Same-sender consistency across inbound loads Proposed
75 dominant_remittance_country Inferred origin country of remittance inflow (US-diaspora focus) Proposed

Cross-Platform Consistency (Schema Prep Only)
1 signal — deferred activation pending PagoSeguro data

# Field Description Status
76 cross_platform_consistency_score Consistency of payment behavior across PagoYa + PagoSeguro for a matched user Schema-only / Deferred

Loan Outcome Feedback Loop
4 signals — new table, partner-reported

# Field Description Status
77 loan_outcome_status Reported outcome from B2B lending partner: paid / default / delinquent Proposed
78 loan_outcome_reported_at Timestamp of partner outcome report Proposed
79 outcome_partner_id Reporting partner identifier Proposed
80 calibration_delta Predicted PTI risk vs. actual reported outcome (calibration input) Proposed

Household & Network Clustering
2 signals — derived from existing colonia + referral data

# Field Description Status
81 colonia_cluster_risk_score Correlated repayment risk within a colonia cohort (k-anon enforced) Proposed
82 referral_network_risk_correlation Correlated repayment risk within a user's referral chain Proposed — internal only, compliance-gated

Paula Sentiment & Stress Signals
3 signals — derived from existing Paula conversation logs

# Field Description Status
83 paula_sentiment_score Sentiment score of user's Paula message content (rolling) Proposed
84 financial_stress_language_flag Boolean: stress-indicative language detected in recent messages Proposed
85 sentiment_trend_30d Directional change in sentiment score over 30d Proposed

Address & Employment Stability
3 signals — new capture, KYC/profile-linked

# Field Description Status
86 address_tenure_days Days at current registered address Proposed
87 employment_type Self-reported: formal / informal / gig / unemployed Proposed
88 employment_stability_score Derived stability score from employment_type + tenure signals Proposed

All new signals subject to the same minimum-N reliability floors and NULL-below-floor policy as v3.0/v4.0 fields.
Field 76 requires no build now — reserve column/table structure only; activates when PagoSeguro user-matching is in place.
Fields 77–80 require partner-side outcome reporting — B2B contract addendum (Julio) needed before data will populate; build ingestion schema now regardless.
Field 82 (referral_network_risk_correlation): build for internal risk modeling only. Do NOT expose via pti_export_safe, the B2B API, or any partner-facing endpoint or documentation. Regulatory scrutiny of social-graph-based credit decisions is increasing (e.g. 2026 NY DFS BNPL rule prohibits using a consumer's social network to set credit availability or pricing) — requires Julio's review before any partner-facing or pricing/eligibility use is considered. colonia_cluster_risk_score (81) is not subject to this gate — geographic cohort risk is a distinct and more established category than social-network-based scoring.
