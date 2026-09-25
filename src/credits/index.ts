import { z } from 'zod';

/**
 * Credits (spec 05 §6.20, spec 06 §10): a thin re-export of `@sudobility/types`' generic consumables
 * shapes, plus the two things specific to ViaInk — the priced product catalog and the purchase
 * handoff for platforms that cannot buy in-app (spec 05 §6.21).
 *
 * The ledger itself (`consumable_balances/_purchases/_usages`) is `@sudobility/consumables_service`'s,
 * called in-process from `screenwriter_api` exactly as `music_api` does; this module never redefines it.
 */
export type {
  ConsumableBalanceResponse,
  ConsumablePurchaseRecord,
  ConsumablePurchaseRequest,
  ConsumableSource,
  ConsumableUsageRecord,
  ConsumableUseRequest,
  ConsumableUseResponse,
} from '@sudobility/types';

export const CONSUMABLE_SOURCES = ['web', 'apple', 'google', 'free'] as const;

/** `GET /consumables/products`: the priced catalog (`CREDIT_PRODUCTS`, spec 06 §10.1). */
export interface CreditProduct {
  productId: string;
  credits: number;
}

/** `POST /purchases/handoff` (spec 05 §6.21): lets a platform with no in-app purchase (Windows) send the user to the web to buy. */
export const purchaseHandoffRequestSchema = z.object({
  productId: z.string().optional(),
  returnTo: z.string().min(1).max(2000),
});
export type PurchaseHandoffRequest = z.infer<
  typeof purchaseHandoffRequestSchema
>;

export interface PurchaseHandoffResponse {
  handoffUrl: string;
  expiresAt: string;
}
