"use server"

import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { deleteWorkflowRoom } from "@/lib/liveblocks"
import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"

import { createWorkflow, deleteWorkflow, saveWorkflowGraph } from "./data"
import { WorkflowGraph } from "@/lib/db/schema"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
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
