import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * One row per Clerk organization — an org has at most one Dodo subscription.
 * `planId` is a catalog key from `features/billing/plans.ts` rather than a
 * database enum, so adding a plan needs no migration.
 */
export const subscriptions = pgTable("subscriptions", {
  orgId: text("org_id").primaryKey(),
  planId: text("plan_id").notNull(),
  dodoSubscriptionId: text("dodo_subscription_id").notNull().unique(),
  dodoCustomerId: text("dodo_customer_id").notNull(),
  // Dodo's status verbatim: pending | active | on_hold | paused | cancelled |
  // failed | expired | past_due. Entitlement is derived, never stored.
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Subscription = typeof subscriptions.$inferSelect

/**
 * Idempotency ledger for Dodo webhook deliveries, keyed by the `webhook-id`
 * header. Dodo retries, so every delivery is claimed before its effects run.
 */
export const webhookEvents = pgTable("webhook_events", {
  webhookId: text("webhook_id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
})
