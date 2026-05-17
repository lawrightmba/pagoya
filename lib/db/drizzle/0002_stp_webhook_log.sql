CREATE TABLE "stp_webhook_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "raw_payload" jsonb,
  "status" text NOT NULL,
  "error" text,
  "received_at" timestamptz DEFAULT now() NOT NULL
);
