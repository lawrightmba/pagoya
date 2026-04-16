export type BillCategory =
  | "Luz"
  | "Agua"
  | "Gas"
  | "Internet"
  | "Cable"
  | "Teléfono móvil"
  | "Streaming"
  | "Préstamos"
  | "Seguro"
  | "Escuela"
  | "Renta"
  | "Otro";

export type ProviderName = "siprel" | "evoluciona";

export interface BillService {
  id: string;
  name: string;
  category: BillCategory;
  providers: ProviderName[];
  logoEmoji: string;
  siprelServiceId?: string;
  evolucionaServiceId?: string;
  minReferencia?: number;
  minAmount?: number;
}

export interface BillPayRequest {
  serviceId: string;
  referencia: string;
  monto: number;
  telefono: string;
  notas?: string;
}

export interface BillPayResult {
  success: boolean;
  confirmationCode: string;
  provider: ProviderName;
  timestamp: string;
  failoverUsed: boolean;
  rawResponse?: unknown;
}

export interface ProviderAdapter {
  name: ProviderName;
  isAvailable(): boolean;
  pay(service: BillService, req: BillPayRequest): Promise<BillPayResult>;
  getSaldoBalance?(): Promise<number>;
}
