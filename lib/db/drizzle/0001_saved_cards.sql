ALTER TABLE "users" ADD COLUMN "conekta_customer_id" text;

CREATE TABLE "saved_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_telefono" text NOT NULL REFERENCES "users"("telefono") ON DELETE CASCADE,
  "conekta_card_token" text NOT NULL,
  "last_four" text NOT NULL,
  "brand" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);
