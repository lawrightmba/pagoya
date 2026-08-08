/**
 * Build 3A — Startup Readiness Tracker (Trajectory Foundation)
 *
 * Tracks whether ensureBuild3aTables() has completed so Build 3A admin
 * routes return a controlled 503 instead of raw "relation does not exist" errors.
 *
 * Guarantees:
 * - Primary PagoYa app, Build 1A, and Build 2A (2A-1 through 2A-6) are
 *   NEVER affected by Build 3A state. Build 3A failure cannot make 2A unavailable.
 * - Build 3A routes return 503 while pending or failed, and pass through to
 *   adminAuth while ready.
 * - Migration failures are visible in logs — never swallowed.
 * - Build 3A is ready only after all of 2A-1 through 2A-6 are confirmed ready
 *   AND Build 3A's own migrations succeed AND the trajectory rule key is available.
 * - Raw database errors are never exposed through HTTP responses.
 */

import type { Request, Response, NextFunction } from "express";

type Build3aState = "pending" | "ready" | "failed";

let _state: Build3aState = "pending";
let _failureMessage: string | null = null;

export function setBuild3aReady(): void {
  _state = "ready";
  _failureMessage = null;
}

export function setBuild3aFailed(err: unknown): void {
  _state = "failed";
  _failureMessage = err instanceof Error ? err.message : String(err);
}

export function getBuild3aReadiness(): { state: Build3aState; failureMessage: string | null } {
  return { state: _state, failureMessage: _failureMessage };
}

export function isBuild3aReady(): boolean {
  return _state === "ready";
}

/**
 * TEST-ONLY: Reset state back to 'pending'.
 * Never call from production code.
 */
export function _resetBuild3aToPendingForTesting(): void {
  _state = "pending";
  _failureMessage = null;
}

/**
 * Express middleware. Mount BEFORE adminAuth on every Build 3A route.
 *
 * - pending → 503 { error: "Build 3A initialization pending" }
 * - failed  → 503 { error: "Build 3A initialization failed" }
 * - ready   → next() (falls through to adminAuth and handler)
 *
 * Build 2A routes, Build 1A routes, and PagoYa routes are completely unaffected.
 * Only mounted on /admin/build3a/* routes.
 */
export function build3aNotReadyMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (_state === "ready") {
    next();
    return;
  }
  if (_state === "pending") {
    res.status(503).json({
      error: "Build 3A initialization pending",
      hint: "ensureBuild3aTables() has not yet completed — retry in a moment. Build 2A and PagoYa are unaffected.",
    });
    return;
  }
  // failed — do NOT expose raw error
  res.status(503).json({
    error: "Build 3A initialization failed",
    hint: "Check server logs for details. Build 2A, Build 1A, and PagoYa functionality are unaffected.",
  });
}
