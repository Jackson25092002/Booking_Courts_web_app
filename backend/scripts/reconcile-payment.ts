import "dotenv/config";
import { reconcilePayment } from "../lib/reconcile-payment";
import prisma from "../lib/prisma";
const reference = process.argv[2];
if (!/^[a-f0-9]{32}$/.test(reference || "")) throw new Error("Provide a payment txnRef");
reconcilePayment(reference).then((result) => console.log(result)).catch((error) => { console.error(error instanceof Error ? error.message : "Reconciliation failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
