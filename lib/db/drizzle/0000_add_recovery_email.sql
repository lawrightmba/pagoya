ALTER TABLE "users" ADD COLUMN "recovery_email" text;
CREATE UNIQUE INDEX "users_recovery_email_uidx" ON "users" ("recovery_email") WHERE "recovery_email" IS NOT NULL;
