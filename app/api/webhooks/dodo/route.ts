import { NextResponse } from "next/server"
import type { WebhookPayload } from "dodopayments/resources/webhook-events"

import {
  claimWebhookEvent,
  getSubscriptionByDodoId,
  releaseWebhookEvent,
  upsertSubscription,
} from "@/features/billing/data"
import { FREE_PLAN_ID, findPlanByProductId } from "@/features/billing/plans"
import { dodo } from "@/lib/dodo"

/** Every subscription event carries the full row snapshot, so one handler fits all. */
const SUBSCRIPTION_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.on_hold",
  "subscription.past_due",
  "subscription.paused",
  "subscription.unpaused",
  "subscription.plan_changed",
  "subscription.updated",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
])

/**
 * Maps a Dodo subscription onto a Clerk organization and a catalog plan.
 * Checkout stamps both into metadata; renewals and portal-driven changes carry
 * no metadata, so those fall back to the stored row and the product catalog.
 */
async function resolveOwner(subscription: WebhookPayload.Subscription) {
  const existing = await getSubscriptionByDodoId(subscription.subscription_id)
  // Dodo metadata values are `string | number | boolean`; ours are always
  // strings, so anything else is treated as absent.
  const metadata = (key: string) => {
    const value = subscription.metadata?.[key]
    return typeof value === "string" ? value : undefined
  }

  return {
    orgId: metadata("orgId") ?? existing?.orgId,
    planId:
      metadata("planId") ??
      findPlanByProductId(subscription.product_id)?.id ??
      existing?.planId ??
      FREE_PLAN_ID,
  }
}

export async function POST(request: Request) {
  // Signature verification needs the exact bytes — never parse and re-stringify.
  const body = await request.text()
  const webhookId = request.headers.get("webhook-id")

  let event
  try {
    event = dodo.webhooks.unwrap(body, {
      headers: {
        "webhook-id": webhookId ?? "",
        "webhook-signature": request.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      },
    })
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (!webhookId) {
    return NextResponse.json({ error: "Missing webhook-id" }, { status: 400 })
  }

  if (!SUBSCRIPTION_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type })
  }

  // Dodo retries deliveries; claim the id so the write runs at most once.
  const claimed = await claimWebhookEvent(webhookId, event.type)

  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    const subscription = event.data as WebhookPayload.Subscription
    const { orgId, planId } = await resolveOwner(subscription)

    if (!orgId) {
      // Nothing to attach the subscription to. Acknowledge so Dodo stops
      // retrying, but keep it visible in the logs.
      console.warn(
        `Dodo subscription ${subscription.subscription_id} has no org; ignoring ${event.type}`
      )
      return NextResponse.json({ received: true, unmapped: true })
    }

    await upsertSubscription({
      orgId,
      planId,
      dodoSubscriptionId: subscription.subscription_id,
      dodoCustomerId: subscription.customer.customer_id,
      status: subscription.status,
      currentPeriodEnd: subscription.next_billing_date
        ? new Date(subscription.next_billing_date)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    // The claim and the write cannot share a transaction on the Neon HTTP
    // driver, so drop the claim to let Dodo's redelivery retry.
    await releaseWebhookEvent(webhookId)
    throw error
  }
}
