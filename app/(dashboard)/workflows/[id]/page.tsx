import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { ReactFlowProvider } from "@xyflow/react"

import { getWorkflow } from "@/features/workflows/data"
import { getOrCreateWorkflowRoom } from "@/lib/liveblocks"

import { Room } from "@/features/workflows/components/room"
import { WorkflowRunsProvider } from "@/features/workflows/components/workflow-runs-provider"
import { WorkflowShell } from "@/features/workflows/components/workflow-shell"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { orgId } = await auth()
  if (!orgId) notFound()

  const workflow = await getWorkflow(orgId, id)
  if (!workflow) notFound()

  await getOrCreateWorkflowRoom({
    roomId: id,
    orgId,
    title: workflow.name,
  })

  // Read-only, and only for this workflow's runs — the tag the run action
  // attaches. An hour outlasts any run while keeping a leaked token short-lived.
  const publicAccessToken = await triggerAuth.createPublicToken({
    scopes: { read: { tags: [`workflow:${id}`] } },
    expirationTime: "1h",
  })

  return (
    <Room roomId={id}>
      {/* Above both the canvas and the sidebar, so the palette can add nodes to
          the same React Flow store the canvas renders. */}
      <ReactFlowProvider>
        <WorkflowRunsProvider
          workflowId={id}
          publicAccessToken={publicAccessToken}
        >
          <WorkflowShell workflowId={id} />
        </WorkflowRunsProvider>
      </ReactFlowProvider>
    </Room>
  )
}
