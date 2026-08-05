/**
 * Build 1A — Startup Readiness Tracker (C5)
 *
 * Tracks whether ensureBuild1aTables() has completed so that Build 1A admin
 * routes can return a controlled 503 instead of a raw "relation does not exist"
 * database error during the ~1–2 second window between app.listen() and
 * migration completion.
 *
 * Guarantees:
 * - The primary PagoYa app (all existing routes) is NEVER affected by this.
 * - Build 1A routes return 503 while pending, 503 while failed, and pass
 *   through to adminAuth while ready.
 * - Migration failure is visible in logs and in the 503 body — never swallowed.
 */

import type { Request, Response, NextFunction } from "express";

type Build1aState = "pending" | "ready" | "failed";

let _state: Build1aState = "pending";
let _failureMessage: string | null = null;

export function setBuild1aReady(): void {
  _state = "ready";
  _failureMessage = null;
}

export function setBuild1aFailed(err: unknown): void {
  _state = "failed";
  _failureMessage = err instanceof Error ? err.message : String(err);
}

export function getBuild1aReadiness(): { state: Build1aState; failureMessage: string | null } {
  return { state: _state, failureMessage: _failureMessage };
}

/**
 * TEST-ONLY: Reset state back to 'pending'.
 * Never call from production code. Used only in startup-gating integration tests
 * to simulate the pre-migration window without restarting the process.
 */
export function _resetToPendingForTesting(): void {
  _state = "pending";
  _failureMessage = null;
}

/**
 * Express middleware. Mount this BEFORE adminAuth on every Build 1A route.
 *
 * - pending → 503 { error: "Build 1A initialization pending" }
 * - failed  → 503 { error: "Build 1A initialization failed", detail: <message> }
 * - ready   → next() (falls through to adminAuth and handler)
 *
 * Does NOT affect any existing PagoYa functionality. Only mounted on
 * /admin/build1a/* routes.
 */
export function build1aNotReadyMiddleware(
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
      error: "Build 1A initialization pending",
      hint: "ensureBuild1aTables() has not yet completed — retry in a moment",
    });
    return;
  }
  // failed
  res.status(503).json({
    error: "Build 1A initialization failed",
    hint: "Check server logs for details. Existing PagoYa functionality is unaffected.",
  });
}
