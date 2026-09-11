/**
 * The plan catalog. Adding a plan means adding an entry here and its product id
 * to the environment — the billing page, checkout, and entitlement checks are
 * all driven off this record.
 */
export type PlanId = "free" | "pro"

/**
 * Per-plan caps. `null` means unlimited. Add a key here and every plan must
 * declare it, so a new limit cannot silently default to unlimited.
 */
export type PlanLimits = {
  workflows: number | null
}

export type Plan = {
  id: PlanId
  name: string
  description: string
  /** Formatted for display; Dodo is the source of truth for what is charged. */
  price: string
  interval: string
  features: string[]
  limits: PlanLimits
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
      "Up to 2 workflows",
      "Manual workflow runs",
      "Run history and session replays",
    ],
    limits: { workflows: 2 },
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
      "Unlimited workflows",
      "Unlimited workflow runs",
      "Scheduled and triggered runs",
      "Priority support",
    ],
    limits: { workflows: null },
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
