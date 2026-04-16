import type { ProviderAdapter, BillService, BillPayRequest, BillPayResult } from "../types/billpay.js";

export const evolucionaProvider: ProviderAdapter = {
  name: "evoluciona",

  isAvailable(): boolean {
    return !!(
      process.env.EVOLUCIONA_API_KEY &&
      process.env.EVOLUCIONA_USER_ID
    );
  },

  async pay(service: BillService, req: BillPayRequest): Promise<BillPayResult> {
    const apiKey = process.env.EVOLUCIONA_API_KEY!;
    const userId = process.env.EVOLUCIONA_USER_ID!;
    const mode = process.env.EVOLUCIONA_MODE ?? "postpago";
    const serviceId = service.evolucionaServiceId ?? service.id.toUpperCase();

    const payload = {
      user: userId,
      servicio: serviceId,
      referencia: req.referencia,
      monto: req.monto,
      celular: req.telefono,
      modalidad: mode,
    };

    const response = await fetch("https://api.evoluciona.mx/v1/pagar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Evoluciona error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { folio?: string; codigo?: string; [k: string]: unknown };
    const confirmationCode = data.folio ?? data.codigo ?? `EVO-${Date.now()}`;

    return {
      success: true,
      confirmationCode,
      provider: "evoluciona",
      timestamp: new Date().toISOString(),
      failoverUsed: false,
      rawResponse: data,
    };
  },
};
