"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, WorkflowIcon } from "lucide-react"
import { toast } from "sonner"

import { createWorkflowAction } from "@/features/workflows/actions"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import {
  workflowLimitMessage,
  type WorkflowLimit,
} from "@/features/workflows/lib/workflow-limit"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function WorkflowEmptyState({
  workflowLimit,
}: {
  workflowLimit: WorkflowLimit
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const atLimit = !workflowLimit.canCreate

  const handleCreate = () => {
    startTransition(async () => {
      // Creates the row, then redirects to it. The redirect rejects this
      // promise with a NEXT_REDIRECT error the router handles, so it is
      // deliberately left uncaught; only a refusal returns a value.
      const result = await createWorkflowAction(generateSlug())

      if (result?.error) {
        toast.error(result.error, {
          action: { label: "Upgrade", onClick: () => router.push("/billing") },
        })
      }
    })
  }

  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WorkflowIcon />
        </EmptyMedia>
        <EmptyTitle>
          {atLimit ? "Workflow limit reached" : "No workflow selected"}
        </EmptyTitle>
        <EmptyDescription>
          {atLimit
            ? workflowLimitMessage(workflowLimit)
            : "Select a workflow from the sidebar or create a new one to get started."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {atLimit ? (
          <Button onClick={() => router.push("/billing")}>View plans</Button>
        ) : (
          <Button disabled={isPending} onClick={handleCreate}>
            <PlusIcon />
            New workflow
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )
}
