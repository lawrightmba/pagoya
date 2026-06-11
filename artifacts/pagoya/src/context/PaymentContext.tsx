import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface PaymentData {
  empresa: string;
  categoria: string;
  monto: string;
  referencia: string;
  telefono: string;
  notas: string;
}

interface PaymentContextType {
  paymentData: PaymentData;
  setPaymentData: (data: PaymentData) => void;
  clientSecret: string;
  setClientSecret: (s: string) => void;
  pendingPaymentIntentId: string;
  setPendingPaymentIntentId: (id: string) => void;
  transactionId: string;
  setTransactionId: (id: string) => void;
  transactionDate: string;
  setTransactionDate: (date: string) => void;
  resetPayment: () => void;
}

const defaultPayment: PaymentData = {
  empresa: "",
  categoria: "",
  monto: "",
  referencia: "",
  telefono: "",
  notas: "",
};

const SESSION_KEY = "pagoya_payment_ctx_v1";

function readSession(): Partial<PaymentData> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Partial<PaymentData>) : {};
  } catch { return {}; }
}

function writeSession(data: PaymentData) {
  try {
    // Only persist if there's an active payment in progress
    if (data.empresa) sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

const PaymentContext = createContext<PaymentContextType | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [paymentData, _setPaymentData] = useState<PaymentData>(() => ({
    ...defaultPayment,
    ...readSession(),
  }));
  const [clientSecret, setClientSecret] = useState("");
  const [pendingPaymentIntentId, setPendingPaymentIntentId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  // Keep sessionStorage in sync whenever paymentData changes
  useEffect(() => { writeSession(paymentData); }, [paymentData]);

  function setPaymentData(data: PaymentData) {
    _setPaymentData(data);
    writeSession(data);
  }

  const resetPayment = () => {
    _setPaymentData(defaultPayment);
    setClientSecret("");
    setPendingPaymentIntentId("");
    setTransactionId("");
    setTransactionDate("");
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  };

  return (
    <PaymentContext.Provider value={{
      paymentData, setPaymentData,
      clientSecret, setClientSecret,
      pendingPaymentIntentId, setPendingPaymentIntentId,
      transactionId, setTransactionId,
      transactionDate, setTransactionDate,
      resetPayment,
    }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment must be used inside PaymentProvider");
  return ctx;
}
