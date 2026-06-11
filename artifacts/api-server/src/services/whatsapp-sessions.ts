export interface PendingWithdrawalSession {
  telefono: string;
  destinationClabe: string;
  amountMXN: number;
  beneficiaryName: string;
  walletBalance: number;
  expiresAt: number;
}

export interface PendingP2PSession {
  senderTelefono: string;
  recipientTelefono: string;
  recipientName: string;
  amountMXN: number;
  walletBalance: number;
  memo?: string;
  expiresAt: number;
}

export interface WhatsAppSession {
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  repCode: string | null;
  profileName: string | null;
  lastActivity: number;
  pendingWithdrawal: PendingWithdrawalSession | null;
  pendingP2P: PendingP2PSession | null;
  awaitingName?: boolean;
  lang: "es" | "en";
}

const sessions = new Map<string, WhatsAppSession>();

export function getSession(waId: string): WhatsAppSession {
  const existing = sessions.get(waId);
  if (existing) return existing;
  const fresh: WhatsAppSession = {
    conversationHistory: [],
    repCode: null,
    profileName: null,
    lastActivity: Date.now(),
    pendingWithdrawal: null,
    pendingP2P: null,
    lang: "es",
  };
  sessions.set(waId, fresh);
  return fresh;
}

export function saveSession(waId: string, data: Partial<WhatsAppSession>): void {
  const current = getSession(waId);
  sessions.set(waId, { ...current, ...data, lastActivity: Date.now() });
}

const TTL_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.lastActivity > TTL_MS) {
      sessions.delete(key);
    }
  }
}, 5 * 60 * 1000);
