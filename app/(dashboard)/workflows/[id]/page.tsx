import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { ReactFlowProvider } from "@xyflow/react"

import { getWorkflow } from "@/features/workflows/data"
import { getOrCreateWorkflowRoom } from "@/lib/liveblocks"

import { Room } from "@/features/workflows/components/room"
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

  return (
    <Room roomId={id}>
      {/* Above both the canvas and the sidebar, so the palette can add nodes to
          the same React Flow store the canvas renders. */}
      <ReactFlowProvider>
        <WorkflowShell workflowId={id} />
      </ReactFlowProvider>
    </Room>
  )
}
