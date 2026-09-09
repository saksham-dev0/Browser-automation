"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"

import type {
  RunStep,
  runWorkflowTask,
} from "@/features/workflows/tasks/run-workflow"

// A run is "live" while it is still on its way to finishing — the canvas uses
// this to keep spinners going and to leave the Run button disabled.
const LIVE_STATUSES = ["QUEUED", "EXECUTING"]

type WorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

type WorkflowRunsContextValue = {
  runs: WorkflowRun[]
  error?: Error
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | null>(null)

/**
 * One shared realtime subscription to every run of this workflow, keyed by the
 * `workflow:<id>` tag the run action attaches. Everything on the canvas reads
 * from this context instead of opening its own socket.
 *
 * `publicAccessToken` is minted server-side (scoped to the tag) and passed in.
 */
export function WorkflowRunsProvider({
  workflowId,
  publicAccessToken,
  children,
}: {
  workflowId: string
  publicAccessToken: string
  children: ReactNode
}) {
  const { runs, error } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    { accessToken: publicAccessToken, skipColumns: ["payload"] }
  )

  const value = useMemo(() => ({ runs, error }), [runs, error])

  return (
    <WorkflowRunsContext value={value}>{children}</WorkflowRunsContext>
  )
}

function useWorkflowRuns() {
  const context = useContext(WorkflowRunsContext)
  if (!context) {
    throw new Error("useWorkflowRuns must be used inside a WorkflowRunsProvider")
  }
  return context
}

/**
 * The steps of the most recent run, plus whether that run is still going.
 *
 * A finished run's output is the source of truth — metadata is flushed on a
 * timer and can lag behind the last executor — so prefer the returned steps and
 * fall back to the live metadata while the run is still in flight.
 */
export function useLatestRunSteps(): { steps: RunStep[]; isLive: boolean } {
  const { runs } = useWorkflowRuns()

  return useMemo(() => {
    const latest = runs.reduce<WorkflowRun | undefined>(
      (newest, run) =>
        !newest || run.createdAt > newest.createdAt ? run : newest,
      undefined
    )

    if (!latest) return { steps: [], isLive: false }

    const steps =
      latest.output?.steps ?? (latest.metadata?.steps as RunStep[] | undefined)

    return { steps: steps ?? [], isLive: LIVE_STATUSES.includes(latest.status) }
  }, [runs])
}
