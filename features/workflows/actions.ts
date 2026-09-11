"use server"

import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { deleteWorkflowRoom } from "@/lib/liveblocks"
import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"
import {
  getWorkflowLimit,
  workflowLimitMessage,
} from "@/features/workflows/lib/workflow-limit"
import { getEntitlement } from "@/features/billing/lib/entitlement"
import { getNodeDefinition } from "@/features/workflows/nodes/node-registry"

import { createWorkflow, deleteWorkflow, saveWorkflowGraph } from "./data"
import { WorkflowGraph } from "@/lib/db/schema"

/**
 * Creates a workflow, or returns the reason it was refused. Plan limits are
 * re-checked here rather than trusted from the client, which only disables the
 * button. Returns a message instead of throwing because Next redacts server
 * action errors in production, which would hide the upgrade prompt.
 */
export async function createWorkflowAction(
  name: string
): Promise<{ error: string } | void> {
  const { orgId } = await auth()

  if (!orgId) {
    return { error: "No active organization" }
  }

  const limit = await getWorkflowLimit(orgId)

  if (!limit.canCreate) {
    return { error: workflowLimitMessage(limit) }
  }

  const workflow = await createWorkflow(orgId, name)

  revalidatePath("/workflows", "layout")

  redirect(`/workflows/${workflow.id}`)
}

export async function runWorkflowAction({
  id,
  graph,
}: {
  id: string
  graph: WorkflowGraph
}) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  // The toolbar locks premium nodes, but the graph arrives from the client, so
  // the plan is re-checked here before anything is persisted or billed for.
  const premium = graph.nodes
    .map((node) => getNodeDefinition(node.data.type))
    .filter((def) => def?.premium)

  if (premium.length > 0) {
    const { isPro } = await getEntitlement(orgId)

    if (!isPro) {
      const labels = [...new Set(premium.map((def) => def.label))].join(", ")
      return {
        error: `${labels} ${premium.length === 1 ? "is a Pro node" : "are Pro nodes"}. Upgrade to run this workflow.`,
      }
    }
  }

  await saveWorkflowGraph({ orgId, id, graph })

  const handle = await tasks.trigger<typeof runWorkflowTask>("run-workflow", 
    {workflowId: id, orgId},
    {tags: [`workflow:${id}`]}
  )

  return handle
}

export async function cancelWorkflowRunAction(runId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  await runs.cancel(runId)

}

export async function deleteWorkflowAction(workflowId: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const workflow = await deleteWorkflow(orgId, workflowId)

  if (!workflow) {
    throw new Error("Workflow not found")
  }

  // The room id is the workflow id, so the room outlives the row unless it is
  // removed here.
  await deleteWorkflowRoom(workflowId)

  revalidatePath("/", "layout")

  redirect("/")
}
