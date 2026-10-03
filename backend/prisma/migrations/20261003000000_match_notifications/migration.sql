-- Preserve booking notifications; new notifications may refer to a match instead.
ALTER TABLE "notifications" ALTER COLUMN "booking_id" DROP NOT NULL;
ALTER TABLE "notifications" ADD COLUMN "match_id" UUID;
ALTER TABLE "matches" ADD COLUMN "shortage_notified_at" TIMESTAMP(3);
CREATE INDEX "notifications_match_id_idx" ON "notifications"("match_id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_match_id_fkey"
  FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_exactly_one_target"
  CHECK (("booking_id" IS NOT NULL AND "match_id" IS NULL)
    OR ("booking_id" IS NULL AND "match_id" IS NOT NULL));
