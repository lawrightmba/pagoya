import { siprelProvider } from "../providers/siprel.js";
import { evolucionaProvider } from "../providers/evoluciona.js";
import { getServiceById } from "./catalog.js";
import type { BillPayRequest, BillPayResult, ProviderName } from "../types/billpay.js";

const ALL_PROVIDERS = [siprelProvider, evolucionaProvider];

export function getAvailableProviders(): ProviderName[] {
  return ALL_PROVIDERS.filter((p) => p.isAvailable()).map((p) => p.name);
}

export async function routePayment(req: BillPayRequest): Promise<BillPayResult> {
  const service = getServiceById(req.serviceId);
  if (!service) {
    throw new Error(`Servicio no encontrado: ${req.serviceId}`);
  }

  const candidates = service.providers
    .map((name) => ALL_PROVIDERS.find((p) => p.name === name))
    .filter((p): p is (typeof ALL_PROVIDERS)[number] => !!p && p.isAvailable());

  if (candidates.length === 0) {
    throw new Error(
      `No hay proveedores disponibles para el servicio "${service.name}". ` +
      `Verifica las variables de entorno SIPREL_API_KEY / EVOLUCIONA_API_KEY.`
    );
  }

  // Try each provider in order, first success wins.
  const errors: string[] = [];
  for (const provider of candidates) {
    try {
      const result = await provider.pay(service, req);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${provider.name}] ${msg}`);
    }
  }

  throw new Error(`Todos los proveedores fallaron:\n${errors.join("\n")}`);
}
