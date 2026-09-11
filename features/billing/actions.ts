"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { dodo } from "@/lib/dodo"

import { getSubscription } from "./data"
import { getPlan, type PlanId } from "./plans"

/** Absolute origin Dodo redirects back to after checkout or the portal. */
function appUrl(path: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL

  if (!origin) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set")
  }

  return new URL(path, origin).toString()
}

/**
 * Billing belongs to the organization, so only its admins may start a checkout
 * or open the portal.
 */
async function requireBillingAdmin() {
  const { orgId, has } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  if (!has({ role: "org:admin" })) {
    throw new Error("Only organization admins can manage billing")
  }

  return orgId
}

export async function startCheckoutAction(planId: PlanId) {
  const orgId = await requireBillingAdmin()
  const plan = getPlan(planId)

  if (!plan.productId) {
    throw new Error(`Plan "${planId}" has no Dodo product configured`)
  }

  const [user, existing] = await Promise.all([currentUser(), getSubscription(orgId)])
  const email = user?.primaryEmailAddress?.emailAddress

  if (!email) {
    throw new Error("No email address on the current user")
  }

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: plan.productId, quantity: 1 }],
    // Reuse the Dodo customer once the org has one so invoices, the portal, and
    // saved payment methods stay on a single customer record.
    customer: existing
      ? { customer_id: existing.dodoCustomerId }
      : { email, name: user.fullName ?? email },
    // Echoed back on every subscription webhook — this is how a Dodo
    // subscription is mapped to a Clerk organization.
    metadata: { orgId, planId: plan.id },
    return_url: appUrl("/billing?checkout=success"),
  })

  if (!session.checkout_url) {
    throw new Error("Dodo did not return a checkout URL")
  }

  redirect(session.checkout_url)
}

export async function openBillingPortalAction() {
  const orgId = await requireBillingAdmin()
  const subscription = await getSubscription(orgId)

  if (!subscription) {
    throw new Error("This organization has no subscription to manage")
  }

  const session = await dodo.customers.customerPortal.create(
    subscription.dodoCustomerId,
    { return_url: appUrl("/billing") }
  )

  redirect(session.link)
}
