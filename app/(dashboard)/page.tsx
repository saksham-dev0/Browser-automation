import { auth } from "@clerk/nextjs/server"

import { WorkflowEmptyState } from "@/features/workflows/components/workflow-empty-state"
import { getWorkflowLimit } from "@/features/workflows/lib/workflow-limit"

export default async function Page() {
  const { orgId } = await auth()

  if (!orgId) return null

  return <WorkflowEmptyState workflowLimit={await getWorkflowLimit(orgId)} />
}
