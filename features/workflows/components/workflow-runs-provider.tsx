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

// A finished run's output is the source of truth — metadata is flushed on a
// timer and can lag behind the last executor — so prefer the returned steps and
// fall back to the live metadata while the run is still in flight.
function stepsOf(run: WorkflowRun): RunStep[] {
  return (
    run.output?.steps ?? (run.metadata?.steps as RunStep[] | undefined) ?? []
  )
}

// One run as the console renders it: the steps it walked, whether it is still
// going, and the timings the row header shows.
export type RunHistoryEntry = {
  id: string
  status: WorkflowRun["status"]
  isLive: boolean
  createdAt: Date
  startedAt?: Date
  finishedAt?: Date
  // Wall-clock time the whole run took, as Trigger.dev measured it.
  durationMs: number
  // Set when the run itself failed — the message the console shows on the run
  // row, above whichever step threw.
  error?: string
  steps: RunStep[]
  // The Browserbase session the run drove, for the replay panel. Only set once
  // the run has finished — it comes from the run's output, not the live
  // metadata, because the recording lags the session close anyway.
  browserbaseSessionId?: string
}

/**
 * Every run of this workflow with its steps, newest first — what the console
 * under the canvas lists.
 */
export function useRunHistory(): {
  runs: RunHistoryEntry[]
  error?: Error
} {
  const { runs, error } = useWorkflowRuns()

  return useMemo(
    () => ({
      error,
      runs: [...runs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((run) => ({
          id: run.id,
          status: run.status,
          isLive: LIVE_STATUSES.includes(run.status),
          createdAt: run.createdAt,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          durationMs: run.durationMs,
          error: run.error?.message,
          steps: stepsOf(run),
          browserbaseSessionId: run.output?.browserbaseSessionId,
        })),
    }),
    [runs, error]
  )
}

/**
 * The steps of the most recent run, plus whether that run is still going — what
 * the canvas paints onto its nodes.
 */
export function useLatestRunSteps(): { steps: RunStep[]; isLive: boolean } {
  const { runs } = useRunHistory()
  const latest = runs[0]

  return latest
    ? { steps: latest.steps, isLive: latest.isLive }
    : { steps: [], isLive: false }
}
