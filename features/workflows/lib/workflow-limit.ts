import { getEntitlement } from "@/features/billing/lib/entitlement"
import { countWorkflows } from "@/features/workflows/data"

export type WorkflowLimit = {
  /** Workflows the plan allows, or `null` when unlimited. */
  limit: number | null
  used: number
  canCreate: boolean
  planName: string
  isPro: boolean
}

/**
 * The authoritative answer to "may this org create another workflow?". The
 * sidebar reads it to render state; `createWorkflowAction` re-reads it to
 * enforce, because the client copy can be stale or forged.
 */
export async function getWorkflowLimit(orgId: string): Promise<WorkflowLimit> {
  const entitlement = await getEntitlement(orgId)
  const limit = entitlement.plan.limits.workflows

  // Unlimited plans never render a usage count, so skip the query entirely.
  if (limit === null) {
    return {
      limit: null,
      used: 0,
      canCreate: true,
      planName: entitlement.plan.name,
      isPro: entitlement.isPro,
    }
  }

  const used = await countWorkflows(orgId)

  return {
    limit,
    used,
    canCreate: used < limit,
    planName: entitlement.plan.name,
    isPro: entitlement.isPro,
  }
}

export function workflowLimitMessage(limit: WorkflowLimit) {
  return `The ${limit.planName} plan is limited to ${limit.limit} workflows. Upgrade to Pro to create more.`
}
