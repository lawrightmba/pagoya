import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Liveness probe — responds immediately regardless of migration state.
// The platform healthchecks GET /api; this returns 200 as soon as the HTTP
// server is listening, decoupled from the migration readiness chain.
// Functional routes continue to block via their own readiness middleware
// (build1aNotReadyMiddleware, build2aNotReadyMiddleware, build3aNotReadyMiddleware)
// until migrations actually complete — that behaviour is unchanged.
router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
