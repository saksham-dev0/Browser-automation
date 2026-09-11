/**
 * The plan catalog. Adding a plan means adding an entry here and its product id
 * to the environment — the billing page, checkout, and entitlement checks are
 * all driven off this record.
 */
export type PlanId = "free" | "pro"

export type Plan = {
  id: PlanId
  name: string
  description: string
  /** Formatted for display; Dodo is the source of truth for what is charged. */
  price: string
  interval: string
  features: string[]
  /** Dodo product id. `null` for plans that are never checked out. */
  productId: string | null
}

export const FREE_PLAN_ID = "free" satisfies PlanId

export const plans = {
  free: {
    id: "free",
    name: "Free",
    description: "Build and run workflows while you explore.",
    price: "$0",
    interval: "forever",
    features: [
      "Unlimited workflow drafts",
      "Manual workflow runs",
      "Run history and session replays",
    ],
    productId: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For teams running browser automations in production.",
    price: "$29",
    interval: "per month",
    features: [
      "Everything in Free",
      "Unlimited workflow runs",
      "Scheduled and triggered runs",
      "Priority support",
    ],
    productId: process.env.DODO_PRO_PRODUCT_ID ?? null,
  },
} satisfies Record<PlanId, Plan>

/** Plans a customer can check out, in display order. */
export const paidPlans: Plan[] = [plans.pro]

export function getPlan(planId: string): Plan {
  return plans[planId as PlanId] ?? plans.free
}

export function findPlanByProductId(productId: string): Plan | undefined {
  return paidPlans.find((plan) => plan.productId === productId)
}
