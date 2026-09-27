CREATE TYPE "PaymentStatus" AS ENUM ('WAITING', 'SUCCEEDED', 'FAILED');
CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "txn_ref" VARCHAR(100) NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'WAITING',
  "payment_url" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "response_code" VARCHAR(10),
  "transaction_no" VARCHAR(100),
  "bank_code" VARCHAR(20),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_positive_amount" CHECK ("amount" > 0),
  CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payments_txn_ref_key" ON "payments"("txn_ref");
CREATE INDEX "payments_booking_id_created_at_idx" ON "payments"("booking_id", "created_at");
