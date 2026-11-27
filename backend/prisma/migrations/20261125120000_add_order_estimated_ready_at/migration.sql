-- Add the optional operator-provided ready estimate to existing orders.
-- Nullable with no default: existing rows remain intact and are not backfilled.
ALTER TABLE "Order" ADD COLUMN "estimatedReadyAt" TIMESTAMP(3);
