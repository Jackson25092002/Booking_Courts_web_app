import { isIP } from "node:net";
import { VNPay, HashAlgorithm, type ReturnQueryFromVNPay } from "vnpay";

export function getVNPay() {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
  const secureSecret = process.env.VNPAY_HASH_SECRET?.trim();
  const returnUrl = process.env.VNPAY_RETURN_URL?.trim();
  if (!tmnCode || !secureSecret || !returnUrl) throw new Error("VNPAY_NOT_CONFIGURED");
  const endpoint = new URL(process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
  if (endpoint.protocol !== "https:") throw new Error("VNPAY_NOT_CONFIGURED");
  return {
    returnUrl,
    tmnCode,
    client: new VNPay({
      tmnCode, secureSecret, vnpayHost: endpoint.origin,
      testMode: endpoint.hostname === "sandbox.vnpayment.vn",
      hashAlgorithm: HashAlgorithm.SHA512, enableLog: false,
      endpoints: { paymentEndpoint: endpoint.pathname.replace(/^\//, "") },
    }),
  };
}

// Explicit UTC+7 formatting: independent of the server's timezone.
export function vnpayDate(date: Date) {
  return Number(new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace(/\D/g, ""));
}

export function paymentClientIp(request: Request) {
  // Only trust forwarded headers when deployed behind a trusted reverse proxy.
  const candidate = process.env.TRUST_PROXY === "true"
    ? (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "")
    : "";
  return isIP(candidate) ? candidate : "127.0.0.1";
}

export function verifyVNPayQuery(search: URLSearchParams, ipn = false) {
  const { client, tmnCode } = getVNPay();
  const values: Record<string, string> = {};
  for (const [key, value] of search) {
    if (!key.startsWith("vnp_") || key in values) return null;
    values[key] = value;
  }
  if (values.vnp_TmnCode !== tmnCode || !values.vnp_TxnRef ||
      !/^\d+$/.test(values.vnp_Amount || "") ||
      !/^[a-fA-F0-9]{128}$/.test(values.vnp_SecureHash || "")) return null;
  try {
    const result = ipn
      ? client.verifyIpnCall(values as unknown as ReturnQueryFromVNPay)
      : client.verifyReturnUrl(values as unknown as ReturnQueryFromVNPay);
    return result.isVerified ? result : null;
  } catch {
    return null;
  }
}

export function isSuccessfulPayment(query: { vnp_ResponseCode: string | number; vnp_TransactionStatus?: string | number }) {
  return query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";
}
