"use client"

import { useState, useTransition } from "react"
import { LoaderIcon, PlayIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import { runWorkflowAction } from "../actions"
import { RunStatus } from "./run-status"

type ActiveRun = { runId: string; accessToken: string }

export function RightSidebar({ workflowId }: { workflowId: string }) {
  const [isPending, startTransition] = useTransition()
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleRun() {
    setError(null)
    startTransition(async () => {
      try {
        const { runId, publicAccessToken } = await runWorkflowAction(workflowId)
        setActiveRun({ runId, accessToken: publicAccessToken })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start run")
      }
    })
  }

  return (
    <div className="flex size-full flex-col items-center gap-4 p-4">
      <Button className="w-full" onClick={handleRun} disabled={isPending}>
        {isPending ? (
          <LoaderIcon className="animate-spin" />
        ) : (
          <PlayIcon />
        )}
        Run
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {activeRun && (
        <RunStatus
          key={activeRun.runId}
          runId={activeRun.runId}
          accessToken={activeRun.accessToken}
        />
      )}
    </div>
  )
}
