import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { subscriptions, webhookEvents, type Subscription } from "@/lib/db/schema"

export async function getSubscription(orgId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  return subscription
}

export async function getSubscriptionByDodoId(dodoSubscriptionId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubscriptionId))
    .limit(1)

  return subscription
}

type SubscriptionUpsert = Omit<Subscription, "createdAt" | "updatedAt">

/**
 * Writes the latest Dodo state for an org. Keyed by `orgId`, so replaying a
 * webhook converges on the same row instead of creating a second subscription.
 */
export async function upsertSubscription(values: SubscriptionUpsert) {
  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.orgId,
      set: { ...values, updatedAt: new Date() },
    })
}

/**
 * Claims a webhook delivery. Returns false when this `webhook-id` was already
 * processed, so the caller can skip the side effects and acknowledge.
 */
export async function claimWebhookEvent(webhookId: string, type: string) {
  const claimed = await db
    .insert(webhookEvents)
    .values({ webhookId, type })
    .onConflictDoNothing()
    .returning({ webhookId: webhookEvents.webhookId })

  return claimed.length > 0
}

/**
 * Releases a claim whose side effects failed. The Neon HTTP driver has no
 * interactive transactions, so the claim and the write cannot be committed
 * together — releasing lets Dodo's redelivery retry instead of dropping the
 * event.
 */
export async function releaseWebhookEvent(webhookId: string) {
  await db.delete(webhookEvents).where(eq(webhookEvents.webhookId, webhookId))
}
