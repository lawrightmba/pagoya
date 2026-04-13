import { createContext, useContext, useState, ReactNode } from "react";

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

const PaymentContext = createContext<PaymentContextType | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [paymentData, setPaymentData] = useState<PaymentData>(defaultPayment);
  const [clientSecret, setClientSecret] = useState("");
  const [pendingPaymentIntentId, setPendingPaymentIntentId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const resetPayment = () => {
    setPaymentData(defaultPayment);
    setClientSecret("");
    setPendingPaymentIntentId("");
    setTransactionId("");
    setTransactionDate("");
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
