import { verifyVNPayQuery } from "@/lib/vnpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const target = new URL("/payment/result", process.env.FRONTEND_URL || "http://localhost:5173");
  try {
    const result = verifyVNPayQuery(new URL(request.url).searchParams);
    if (result) target.searchParams.set("txnRef", result.vnp_TxnRef);
    else target.searchParams.set("error", "invalid-signature");
  } catch {
    target.searchParams.set("error", "configuration");
  }
  // Return URL only navigates the browser. IPN is the source of truth for payment state.
  return Response.redirect(target, 303);
}
