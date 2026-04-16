import type { ProviderAdapter, BillService, BillPayRequest, BillPayResult } from "../types/billpay.js";

export const siprelProvider: ProviderAdapter = {
  name: "siprel",

  isAvailable(): boolean {
    return !!(
      process.env.SIPREL_API_KEY &&
      process.env.SIPREL_USER_ID &&
      process.env.SIPREL_BASE_URL
    );
  },

  async pay(service: BillService, req: BillPayRequest): Promise<BillPayResult> {
    const apiKey = process.env.SIPREL_API_KEY!;
    const userId = process.env.SIPREL_USER_ID!;
    const baseUrl = process.env.SIPREL_BASE_URL!;
    const serviceId = service.siprelServiceId ?? service.id.toUpperCase();

    const payload = {
      user_id: userId,
      service: serviceId,
      reference: req.referencia,
      amount: req.monto,
      phone: req.telefono,
    };

    const response = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SIPREL error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { confirmation_code?: string; folio?: string; [k: string]: unknown };
    const confirmationCode = data.confirmation_code ?? data.folio ?? `SIPREL-${Date.now()}`;

    return {
      success: true,
      confirmationCode,
      provider: "siprel",
      timestamp: new Date().toISOString(),
      failoverUsed: false,
      rawResponse: data,
    };
  },

  async getSaldoBalance(): Promise<number> {
    const apiKey = process.env.SIPREL_API_KEY!;
    const userId = process.env.SIPREL_USER_ID!;
    const baseUrl = process.env.SIPREL_BASE_URL!;

    const response = await fetch(`${baseUrl}/balance?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) throw new Error(`SIPREL balance error ${response.status}`);
    const data = (await response.json()) as { balance?: number; saldo?: number };
    return data.balance ?? data.saldo ?? 0;
  },
};
