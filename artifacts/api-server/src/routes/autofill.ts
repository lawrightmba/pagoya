import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, nlpQueriesTable, userProfilesTable, userBillersTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const SYSTEM_PROMPT = `You are a payment assistant for PagoYa, a Mexican bill payment platform. Extract payment intent from the user's message. Always respond with valid JSON only, no other text.

Extract these fields:
- biller_id: one of [cfe, telmex, telcel, izzi, totalplay, sky, netflix, spotify, agua, gas, tenencia, predial, other]
- biller_name: human readable name in Spanish
- amount: number or null (MXN)
- reference: account/contract/phone number found in text or null
- language: 'es' or 'en' based on input language
- confidence: 'high', 'medium', or 'low'
- clarification_needed: null or a short question in the same language as input if critical info is missing

Examples:
Input: 'pagar cfe 350'
Output: {"biller_id":"cfe","biller_name":"CFE","amount":350,"reference":null,"language":"es","confidence":"high","clarification_needed":"Ingresa tu número de servicio CFE"}

Input: 'telcel recarga 200 a 3221002030'
Output: {"biller_id":"telcel","biller_name":"Telcel","amount":200,"reference":"3221002030","language":"es","confidence":"high","clarification_needed":null}

Input: 'pay my netflix'
Output: {"biller_id":"netflix","biller_name":"Netflix","amount":null,"reference":null,"language":"en","confidence":"medium","clarification_needed":"What amount would you like to pay?"}`;

// POST /api/autofill
router.post("/", async (req: Request, res: Response) => {
  const { text, phone } = req.body as { text?: string; phone?: string };

  if (!text || text.trim().length < 3 || text.trim().length > 500) {
    res.status(400).json({ error: "El texto debe tener entre 3 y 500 caracteres." });
    return;
  }

  try {
    // 1. Call Claude
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text.trim() }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== "text") {
      res.status(500).json({ error: "Respuesta inesperada del asistente." });
      return;
    }

    // 2. Parse JSON
    let extracted: {
      biller_id: string;
      biller_name: string;
      amount: number | null;
      reference: string | null;
      language: string;
      confidence: string;
      clarification_needed: string | null;
    };

    try {
      // Strip markdown code blocks if present
      const clean = rawContent.text.replace(/```json\n?|\n?```/g, "").trim();
      extracted = JSON.parse(clean);
    } catch {
      logger.error({ raw: rawContent.text }, "autofill: failed to parse Claude JSON");
      res.status(500).json({ error: "No se pudo interpretar la respuesta." });
      return;
    }

    // 3. Log to nlp_queries
    let queryId: string | null = null;
    try {
      const [q] = await db.insert(nlpQueriesTable).values({
        rawText: text.trim(),
        phone: phone ?? null,
        billerId: extracted.biller_id,
        amount: extracted.amount != null ? String(extracted.amount) : null,
        confidence: extracted.confidence,
        language: extracted.language,
      }).returning({ id: nlpQueriesTable.id });
      queryId = q?.id ?? null;
    } catch (err) {
      logger.error({ err }, "autofill: failed to log nlp_query (non-fatal)");
    }

    // 4. Merge with user history if phone provided and confidence not high
    let prefilledFromHistory = false;

    if (phone && (extracted.confidence === "low" || extracted.confidence === "medium")) {
      try {
        const [profile] = await db
          .select({ id: userProfilesTable.id })
          .from(userProfilesTable)
          .where(eq(userProfilesTable.phone, phone))
          .limit(1);

        if (profile) {
          const [biller] = await db
            .select({
              serviceRef: userBillersTable.serviceRef,
              typicalAmount: userBillersTable.typicalAmount,
            })
            .from(userBillersTable)
            .where(
              and(
                eq(userBillersTable.profileId, profile.id),
                eq(userBillersTable.billerId, extracted.biller_id),
              ),
            )
            .limit(1);

          if (biller) {
            if (!extracted.reference && biller.serviceRef) {
              extracted.reference = biller.serviceRef;
              prefilledFromHistory = true;
            }
            if (extracted.amount == null && biller.typicalAmount) {
              extracted.amount = parseFloat(biller.typicalAmount);
              prefilledFromHistory = true;
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "autofill: history merge failed (non-fatal)");
      }
    }

    logger.info(
      { billerId: extracted.biller_id, confidence: extracted.confidence, prefilledFromHistory, queryId },
      "autofill: success",
    );

    res.json({
      biller_id: extracted.biller_id,
      biller_name: extracted.biller_name,
      amount: extracted.amount,
      reference: extracted.reference,
      language: extracted.language,
      confidence: extracted.confidence,
      clarification_needed: extracted.clarification_needed,
      prefilled_from_history: prefilledFromHistory,
    });
  } catch (err) {
    logger.error({ err }, "autofill: Claude API error");
    res.status(500).json({ error: "Error al procesar tu solicitud. Inténtalo de nuevo." });
  }
});

// PATCH /api/autofill/converted
// Called after a successful payment to mark the NLP query as converted
router.patch("/converted", async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Se requiere 'phone'." });
    return;
  }
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await db
      .update(nlpQueriesTable)
      .set({ converted: true })
      .where(
        and(
          eq(nlpQueriesTable.phone, phone),
          eq(nlpQueriesTable.converted, false),
          gt(nlpQueriesTable.createdAt, oneHourAgo),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "autofill: converted update failed");
    res.status(500).json({ error: "Error al actualizar." });
  }
});

export default router;
