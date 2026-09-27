ALTER TABLE "bookings" ADD COLUMN "confirmed_at" TIMESTAMP(3);
CREATE TABLE "notifications" (
 "id" UUID NOT NULL, "user_id" UUID NOT NULL, "booking_id" UUID NOT NULL,
 "kind" VARCHAR(40) NOT NULL, "message" VARCHAR(500) NOT NULL,
 "read_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
 CONSTRAINT "notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
);
CREATE UNIQUE INDEX "notifications_user_id_booking_id_kind_key" ON "notifications"("user_id", "booking_id", "kind");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
