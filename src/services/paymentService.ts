import api from "./api";

export interface PaymentFeedback {
  title: string;
  message: string;
  advice: string;
  canRetry: boolean;
}

export async function startVNPayPayment(bookingId: string) {
  const response = await api.post<{ data: { paymentUrl: string; txnRef: string; expiresAt: string } }>("/api/payments/vnpay", { bookingId });
  return response.data.data;
}

export async function getVNPayStatus(txnRef: string) {
  const response = await api.get<{ data: {
    payment: { txnRef: string; status: "WAITING" | "SUCCEEDED" | "FAILED"; amount: number; bookingId: string; responseCode: string | null; booking: { status: string; confirmedAt: string | null } };
    expired: boolean;
    feedback: PaymentFeedback;
  } }>("/api/payments/vnpay/status", { params: { txnRef } });
  return response.data.data;
}

export async function reconcileVNPayPayment(txnRef: string) {
  const response = await api.post<{ data: { settled: boolean; message: string; nextReconcileAt?: string } }>(
    "/api/payments/vnpay/reconcile", { txnRef },
  );
  return response.data.data;
}
