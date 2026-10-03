CREATE TABLE "match_participants" (
  "match_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_participants_pkey" PRIMARY KEY ("match_id", "user_id"),
  CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "match_participants_user_id_idx" ON "match_participants"("user_id");
