/**
 * One-off canary send — bypasses paula_send_queue / PAULA_SENDING_ENABLED entirely.
 * Sends a single approved WhatsApp template directly via Twilio to a test number,
 * then polls the message status until it settles (queued -> sent -> delivered/failed).
 *
 * Usage: npx tsx src/scripts/canarySend.ts
 */
import twilio from "twilio";

const TO = "+17138052626";
const CONTENT_SID = "HXcaf5ea42fcf0033aa7f54e8a366f2d2b"; // first_payment (MARKETING)
const VARIABLES = { "1": "Canario", "2": "42" }; // {{nombre}}, {{pti_score}}

async function main(): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
  const from = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;

  if (!accountSid || !authToken) {
    console.error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);
  const toFormatted = `whatsapp:${TO}`;

  console.log(`Sending canary template ${CONTENT_SID} to ${toFormatted} from ${from} ...`);

  const msg = await client.messages.create({
    from,
    to: toFormatted,
    contentSid: CONTENT_SID,
    contentVariables: JSON.stringify(VARIABLES),
  });

  console.log(`Sent. Message SID: ${msg.sid}  initial status: ${msg.status}`);

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const check = await client.messages(msg.sid).fetch();
    console.log(`  [poll ${i + 1}] status=${check.status} errorCode=${check.errorCode ?? "none"} errorMessage=${check.errorMessage ?? "none"}`);
    if (["delivered", "failed", "undelivered"].includes(check.status)) {
      console.log(`\nFinal status: ${check.status}`);
      process.exit(check.status === "delivered" ? 0 : 1);
    }
  }
  console.log("\nTimed out waiting for terminal status (still may deliver later).");
}

main().catch((err) => {
  console.error("Canary send failed:", err);
  process.exit(1);
});
