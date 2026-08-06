/**
 * Build 2A — Startup Readiness Tracker (Package 2A-1)
 *
 * Tracks whether ensureBuild2aTables() has completed so that Build 2A admin
 * routes can return a controlled 503 instead of a raw "relation does not exist"
 * database error during the ~1–2 second window between app.listen() and
 * migration completion.
 *
 * Guarantees:
 * - The primary PagoYa app (all existing routes) is NEVER affected by this.
 * - Build 1A tables, services, and routes are completely unaffected.
 * - Build 2A routes return 503 while pending, 503 while failed, and pass
 *   through to adminAuth while ready.
 * - Migration failure is visible in logs — never swallowed.
 * - Raw database errors are never exposed through HTTP responses.
 */

import type { Request, Response, NextFunction } from "express";

type Build2aState = "pending" | "ready" | "failed";

let _state: Build2aState = "pending";
let _failureMessage: string | null = null;

export function setBuild2aReady(): void {
  _state = "ready";
  _failureMessage = null;
}

export function setBuild2aFailed(err: unknown): void {
  _state = "failed";
  _failureMessage = err instanceof Error ? err.message : String(err);
}

export function getBuild2aReadiness(): { state: Build2aState; failureMessage: string | null } {
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
 * Express middleware. Mount this BEFORE adminAuth on every Build 2A route.
 *
 * - pending → 503 { error: "Build 2A initialization pending" }
 * - failed  → 503 { error: "Build 2A initialization failed" }
 * - ready   → next() (falls through to adminAuth and handler)
 *
 * Does NOT affect any existing PagoYa functionality, Build 1A routes,
 * or any other route. Only mounted on /admin/build2a/* routes.
 */
export function build2aNotReadyMiddleware(
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
      error: "Build 2A initialization pending",
      hint: "ensureBuild2aTables() has not yet completed — retry in a moment",
    });
    return;
  }
  // failed — do NOT expose raw error message
  res.status(503).json({
    error: "Build 2A initialization failed",
    hint: "Check server logs for details. Existing PagoYa and Build 1A functionality is unaffected.",
  });
}
