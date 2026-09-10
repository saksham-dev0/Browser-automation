"use client"

import { useTransition } from "react"
import { PlusIcon, WorkflowIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { createWorkflowAction } from "@/features/workflows/actions"
import { generateSlug } from "@/features/workflows/lib/generate-slug"

export default function Page() {
  const [isPending, startTransition] = useTransition()

  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WorkflowIcon />
        </EmptyMedia>
        <EmptyTitle>No workflow selected</EmptyTitle>
        <EmptyDescription>
          Select a workflow from the sidebar or create a new one to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              // Creates the row, then redirects to it. The redirect rejects this
              // promise with a NEXT_REDIRECT error the router handles, so it is
              // deliberately left uncaught.
              await createWorkflowAction(generateSlug())
            })
          }}
        >
          <PlusIcon />
          New workflow
        </Button>
      </EmptyContent>
    </Empty>
  )
}
