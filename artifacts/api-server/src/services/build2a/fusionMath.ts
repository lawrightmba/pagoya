/**
 * Build 2A — Fusion Mathematics (Package 2A-4)
 *
 * Pure, deterministic Subjective Logic (SL) formulas.
 * No database access. No side effects. Same inputs → same outputs.
 *
 * Scientific basis: Josang, A. (2016). Subjective Logic: A Formalism for
 * Reasoning Under Uncertainty. Springer. Chapter 12 (Fusion operators).
 *
 * All three operators preserve the SL invariant: b + d + u = 1 (proven below).
 *
 * Non-associativity: cumulative and averaging operators are non-associative.
 * The caller MUST supply opinions in the canonical stored order (sequence_number
 * from evidence_bundle_members). This module does NOT re-derive order.
 *
 * DECISION-SEPARATION GUARANTEE:
 *   This file contains only mathematical operations on probability masses.
 *   All outputs are belief/disbelief/uncertainty masses — reasoning only.
 */

// ── Core type ──────────────────────────────────────────────────────────────────

export type SlOpinion = {
  /** Degree of subjective belief the evidence supports the claim. Range [0,1]. */
  belief: number;
  /** Degree of subjective disbelief (evidence contradicts the claim). Range [0,1]. */
  disbelief: number;
  /** Remaining epistemic uncertainty (neither support nor contradiction). Range [0,1]. */
  uncertainty: number;
};

// ── Round helpers ──────────────────────────────────────────────────────────────

/** Clamp a value to [0, 1]. */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Round to 4 decimal places — matches NUMERIC(5,4) columns. */
export function r4(v: number): number {
  return Math.round(v * 10_000) / 10_000;
}

/** Round to 6 decimal places — matches NUMERIC(7,6) columns. */
export function r6(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}

// ── Vacuous opinion ────────────────────────────────────────────────────────────

/** Vacuous SL opinion: no information. Identity element for all fusion operators. */
export const VACUOUS: SlOpinion = { belief: 0, disbelief: 0, uncertainty: 1 };

// ── Invariant validation ───────────────────────────────────────────────────────

/**
 * Returns true iff |b + d + u − 1| < 0.0001.
 * Must be called before inserting an opinion into the DB
 * (the DB CHECK enforces the same tolerance).
 */
export function validateSlInvariant(op: SlOpinion): boolean {
  return (
    op.belief      >= 0 && op.belief      <= 1 &&
    op.disbelief   >= 0 && op.disbelief   <= 1 &&
    op.uncertainty >= 0 && op.uncertainty <= 1 &&
    Math.abs(op.belief + op.disbelief + op.uncertainty - 1.0) < 0.0001
  );
}

// ── Disposition → SL opinion ───────────────────────────────────────────────────

/**
 * Convert an atom's disposition + final_effective_weight to an SL binomial opinion.
 *
 * Weight (from weighted_evidence_contributions.final_effective_weight) determines
 * how much of the opinion is committed vs left as uncertainty.
 *
 * Mapping (per sl_opinion_formation_v1 parameters.disposition_to_sl):
 *   supports    → b=weight,       d=0,          u=1−weight
 *   contradicts → b=0,            d=weight,     u=1−weight
 *   neutral     → b=0,            d=0,          u=1         (vacuous)
 *   ambiguous   → b=weight/2,     d=weight/2,   u=1−weight  (symmetric commitment)
 *   excluded    → b=0,            d=0,          u=1         (treated as vacuous)
 */
export function dispositionToSlOpinion(
  disposition: string,
  weight: number,
): SlOpinion {
  const w = clamp01(weight);
  switch (disposition) {
    case "supports":
      return { belief: w, disbelief: 0, uncertainty: clamp01(1 - w) };
    case "contradicts":
      return { belief: 0, disbelief: w, uncertainty: clamp01(1 - w) };
    case "ambiguous":
      return { belief: r4(w / 2), disbelief: r4(w / 2), uncertainty: clamp01(1 - w) };
    case "neutral":
    case "excluded":
    default:
      return { ...VACUOUS };
  }
}

// ── Pairwise conflict measure ─────────────────────────────────────────────────

/**
 * Pairwise SL conflict between two opinions.
 * C(ω1, ω2) = b1*d2 + d1*b2
 * Range [0, 1]. Zero when at least one opinion is vacuous.
 * Maximum = 1 for fully opposing dogmatic opinions (b1=1,d2=1 or vice versa).
 *
 * The Consensus & Compromise operator uses this value directly (clamping handles
 * edge cases where u would otherwise exceed 1).
 */
export function pairwiseConflict(ω1: SlOpinion, ω2: SlOpinion): number {
  return r6(ω1.belief * ω2.disbelief + ω1.disbelief * ω2.belief);
}

/**
 * Maximum pairwise conflict across all consecutive ordered pairs in a sequence.
 * Evaluated in the order provided — non-commutative aggregation.
 * Returns 0 if fewer than 2 opinions.
 */
export function maxConsecutivePairwiseConflict(opinions: SlOpinion[]): number {
  if (opinions.length < 2) return 0;
  let maxC = 0;
  for (let i = 0; i < opinions.length - 1; i++) {
    const c = pairwiseConflict(opinions[i], opinions[i + 1]);
    if (c > maxC) maxC = c;
  }
  return r6(maxC);
}

// ── Pairwise fusion operators ─────────────────────────────────────────────────

/**
 * Cumulative fusion (SL ⊕): for INDEPENDENT evidence.
 *
 * Non-vacuous case (u1 + u2 − u1*u2 > 0):
 *   k = u1 + u2 − u1*u2
 *   b = (b1*u2 + b2*u1) / k
 *   d = (d1*u2 + d2*u1) / k
 *   u = (u1*u2) / k
 *
 * Dogmatic case (u1 = u2 = 0):
 *   b = (b1 + b2) / 2,  d = (d1 + d2) / 2,  u = 0
 *   (Assumes equal base rates.)
 *
 * Invariant proof: b+d+u = [(b1+d1)*u2+(b2+d2)*u1+u1*u2]/k
 *   = [(1−u1)*u2+(1−u2)*u1+u1*u2]/k = [u1+u2−u1*u2]/k = k/k = 1 ✓
 */
export function cumulativeFuse(ω1: SlOpinion, ω2: SlOpinion): SlOpinion {
  const k = ω1.uncertainty + ω2.uncertainty - ω1.uncertainty * ω2.uncertainty;
  if (k < 1e-10) {
    // Both dogmatic — equal-base-rate average
    return {
      belief:      clamp01((ω1.belief      + ω2.belief)      / 2),
      disbelief:   clamp01((ω1.disbelief   + ω2.disbelief)   / 2),
      uncertainty: 0,
    };
  }
  return {
    belief:      clamp01((ω1.belief    * ω2.uncertainty + ω2.belief    * ω1.uncertainty) / k),
    disbelief:   clamp01((ω1.disbelief * ω2.uncertainty + ω2.disbelief * ω1.uncertainty) / k),
    uncertainty: clamp01((ω1.uncertainty * ω2.uncertainty) / k),
  };
}

/**
 * Averaging fusion (SL ⊕̄): for DEPENDENT or UNSPECIFIED evidence.
 *
 * Non-vacuous case (u1 + u2 > 0):
 *   k = u1 + u2
 *   b = (b1*u2 + b2*u1) / k
 *   d = (d1*u2 + d2*u1) / k
 *   u = 2*u1*u2 / k
 *
 * Dogmatic case (u1 = u2 = 0):
 *   b = (b1 + b2) / 2,  d = (d1 + d2) / 2,  u = 0
 *
 * Invariant proof: b+d+u = [(b1+d1)*u2+(b2+d2)*u1+2*u1*u2]/(u1+u2)
 *   = [(1−u1)*u2+(1−u2)*u1+2*u1*u2]/(u1+u2) = [u1+u2]/(u1+u2) = 1 ✓
 */
export function averagingFuse(ω1: SlOpinion, ω2: SlOpinion): SlOpinion {
  const k = ω1.uncertainty + ω2.uncertainty;
  if (k < 1e-10) {
    return {
      belief:      clamp01((ω1.belief      + ω2.belief)      / 2),
      disbelief:   clamp01((ω1.disbelief   + ω2.disbelief)   / 2),
      uncertainty: 0,
    };
  }
  return {
    belief:      clamp01((ω1.belief    * ω2.uncertainty + ω2.belief    * ω1.uncertainty) / k),
    disbelief:   clamp01((ω1.disbelief * ω2.uncertainty + ω2.disbelief * ω1.uncertainty) / k),
    uncertainty: clamp01((2 * ω1.uncertainty * ω2.uncertainty) / k),
  };
}

/**
 * Consensus & Compromise fusion: for CONFLICTING evidence (conflict > threshold).
 *
 * Uncertainty-augmented compromise (Josang 2016, Ch. 12):
 *   C = b1*d2 + d1*b2  (pairwise conflict, range [0, 1])
 *   b = (b1+b2)/2 − C/2
 *   d = (d1+d2)/2 − C/2
 *   u = (u1+u2)/2 + C
 *
 * Invariant proof (exact arithmetic, no clamping):
 *   b+d+u = (b1+b2)/2−C/2 + (d1+d2)/2−C/2 + (u1+u2)/2+C
 *         = (b1+d1+u1)/2 + (b2+d2+u2)/2 − C + C = 1/2 + 1/2 = 1 ✓
 *
 * Non-negativity: b = (b1+b2)/2 − (b1*d2+d1*b2)/2 = (b1*(1−d2)+b2*(1−d1))/2 ≥ 0 ✓
 * Uncertainty bound: clamp01 guards against u > 1 for extreme dogmatic inputs.
 */
export function consensusCompromiseFuse(ω1: SlOpinion, ω2: SlOpinion): SlOpinion {
  const C = ω1.belief * ω2.disbelief + ω1.disbelief * ω2.belief;
  return {
    belief:      clamp01((ω1.belief      + ω2.belief)      / 2 - C / 2),
    disbelief:   clamp01((ω1.disbelief   + ω2.disbelief)   / 2 - C / 2),
    uncertainty: clamp01((ω1.uncertainty + ω2.uncertainty) / 2 + C),
  };
}

// ── Multi-evidence fold ────────────────────────────────────────────────────────

/**
 * Fold N opinions into one using the selected operator, left-to-right
 * in the order provided (same order as sequence_number in evidence_bundle_members).
 *
 * Non-associativity: the result depends on the order. Callers MUST pass
 * opinions sorted by sequence_number (ascending). This function never re-sorts.
 *
 * With 0 opinions: returns VACUOUS.
 * With 1 opinion:  returns that opinion unchanged.
 * With N opinions: fold_left(op, opinions[0], opinions[1..N-1]).
 */
export function foldOpinions(
  opinions: SlOpinion[],
  operator: "cumulative" | "averaging" | "consensus_compromise",
): SlOpinion {
  if (opinions.length === 0) return { ...VACUOUS };
  if (opinions.length === 1) return { ...opinions[0] };

  const fuseFn =
    operator === "cumulative"           ? cumulativeFuse :
    operator === "averaging"            ? averagingFuse  :
                                          consensusCompromiseFuse;

  let acc = opinions[0];
  for (let i = 1; i < opinions.length; i++) {
    acc = fuseFn(acc, opinions[i]);
  }
  return acc;
}

// ── SL Binomial Projection ────────────────────────────────────────────────────

/**
 * Compute the SL expected probability (projected probability of the claim).
 * Formula: P(X=1) = belief + base_rate * uncertainty
 *
 * This is the sl_binomial_projection_v1 formula seeded in Package 2A-1.
 * The result is a probability [0,1], not a decision.
 */
export function slBinomialProjection(opinion: SlOpinion, baseRate: number): number {
  return clamp01(opinion.belief + clamp01(baseRate) * opinion.uncertainty);
}

// ── Worked-example verification ────────────────────────────────────────────────

/**
 * Verify key invariants for a given opinion. Returns all failures as strings.
 * Empty array = valid.
 */
export function auditOpinion(op: SlOpinion, label = "opinion"): string[] {
  const errs: string[] = [];
  if (op.belief      < 0 || op.belief      > 1) errs.push(`${label}.belief=${op.belief} not in [0,1]`);
  if (op.disbelief   < 0 || op.disbelief   > 1) errs.push(`${label}.disbelief=${op.disbelief} not in [0,1]`);
  if (op.uncertainty < 0 || op.uncertainty > 1) errs.push(`${label}.uncertainty=${op.uncertainty} not in [0,1]`);
  const sum = op.belief + op.disbelief + op.uncertainty;
  if (Math.abs(sum - 1.0) >= 0.0001) errs.push(`${label}: b+d+u=${sum.toFixed(6)}, expected 1.0 (|delta|=${Math.abs(sum - 1.0).toFixed(6)})`);
  return errs;
}
