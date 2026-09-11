import { auth } from "@clerk/nextjs/server"

import { PlanCard } from "@/features/billing/components/plan-card"
import { SubscriptionSummary } from "@/features/billing/components/subscription-summary"
import { getEntitlement } from "@/features/billing/lib/entitlement"
import { paidPlans } from "@/features/billing/plans"
import { Separator } from "@/components/ui/separator"

export default async function BillingPage() {
  const { orgId, has } = await auth()

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Select an organization to manage billing.
        </p>
      </div>
    )
  }

  const entitlement = await getEntitlement(orgId)
  // Billing belongs to the org, so members can see the plan but not change it.
  const canManage = has({ role: "org:admin" })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s plan, payment method, and invoices.
          </p>
        </header>

        <SubscriptionSummary entitlement={entitlement} canManage={canManage} />

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium">Plans</h2>
          {canManage ? null : (
            <p className="text-sm text-muted-foreground">
              Only organization admins can change the plan.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {paidPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={entitlement.isPro && entitlement.plan.id === plan.id}
                canManage={canManage}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
