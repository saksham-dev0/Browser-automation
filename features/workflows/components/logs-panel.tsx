"use client"

import prettyMilliseconds from "pretty-ms"
import { PlayIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import type { RunStep } from "@/features/workflows/tasks/run-workflow"

import { NodeIcon } from "./node-icon"
import { useRunHistory, type RunHistoryEntry } from "./workflow-runs-provider"

// What the console has open. A step is addressed by the run it belongs to as
// well as its node, since the same node appears once per run; a replay stands
// for a whole run, so the node id is what tells the two apart.
export type ConsoleSelection =
  | { kind: "step"; runId: string; nodeId: string }
  | { kind: "replay"; runId: string }

export function isSameSelection(
  a: ConsoleSelection | null,
  b: ConsoleSelection
) {
  if (a?.kind !== b.kind || a.runId !== b.runId) return false

  return a.kind === "step" && b.kind === "step" ? a.nodeId === b.nodeId : true
}

// Durations only exist once a step has finished, so a running or never-run step
// shows nothing rather than "0ms".
function formatDuration(ms: number | undefined) {
  return ms === undefined ? null : prettyMilliseconds(ms)
}

// One step of one run: its node's icon and title, what it's doing, and how long
// it took. Clicking toggles it as the console's selection.
function StepRow({
  step,
  isSelected,
  isLive,
  onSelect,
}: {
  step: RunStep
  isSelected: boolean
  // Whether the owning run is still going — a crashed run can leave a step
  // stuck on "running", and a spinner that never stops reads as a hang.
  isLive: boolean
  onSelect: () => void
}) {
  const isRunning = step.status === "running" && isLive
  const isFailed = step.status === "failed"
  // A run only reaches some of its steps; the rest never started.
  const isInactive =
    step.status === "pending" || (step.status === "running" && !isLive)
  const duration = formatDuration(step.durationMs)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 pl-8 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent",
        isInactive && "opacity-50"
      )}
    >
      <NodeIcon type={step.type} running={isRunning} />
      <span
        className={cn("truncate font-medium", isFailed && "text-destructive")}
      >
        {step.title}
      </span>
      {duration && (
        <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
          {duration}
        </span>
      )}
    </button>
  )
}

// The run's recording, as one row sitting with the steps it played out. It is
// selectable the same way, but it stands for the whole run rather than a step,
// so it carries no duration of its own.
function ReplayRow({
  isSelected,
  onSelect,
}: {
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 pl-8 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <PlayIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">Replay</span>
    </button>
  )
}

// One run and its steps. The header carries when the run started and, once it
// has finished, how long the whole thing took.
function RunGroup({
  run,
  selected,
  onSelect,
}: {
  run: RunHistoryEntry
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
}) {
  const duration = run.isLive ? null : formatDuration(run.durationMs)
  // The recording only exists for a finished run: the session id arrives with
  // the run's output, and Browserbase assembles the recording after the
  // session closes.
  const hasReplay = Boolean(run.browserbaseSessionId) && !run.isLive

  return (
    <div className="flex flex-col gap-0.5 py-1">
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold">
        <span>{run.createdAt.toLocaleTimeString()}</span>
        <span
          className={cn(
            "font-normal text-muted-foreground",
            run.error && "text-destructive"
          )}
        >
          {run.error ?? run.status.toLowerCase()}
        </span>
        {duration && (
          <span className="ml-auto font-normal text-muted-foreground tabular-nums">
            {duration}
          </span>
        )}
      </div>
      {run.steps.map((step) => (
        <StepRow
          key={step.nodeId}
          step={step}
          isLive={run.isLive}
          isSelected={isSameSelection(selected, {
            kind: "step",
            runId: run.id,
            nodeId: step.nodeId,
          })}
          onSelect={() =>
            onSelect({ kind: "step", runId: run.id, nodeId: step.nodeId })
          }
        />
      ))}
      {hasReplay && (
        <ReplayRow
          isSelected={isSameSelection(selected, {
            kind: "replay",
            runId: run.id,
          })}
          onSelect={() => onSelect({ kind: "replay", runId: run.id })}
        />
      )}
    </div>
  )
}

/**
 * Every run of this workflow, newest first, each with its steps underneath.
 * Selection is owned by the ConsolePanel above so the detail view and the list
 * agree on what is open — a step, or a run's replay.
 */
export function LogsPanel({
  selected,
  onSelect,
}: {
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
}) {
  const { runs, error } = useRunHistory()

  if (error) {
    return (
      <p className="p-3 text-sm text-destructive">
        Couldn&apos;t load runs: {error.message}
      </p>
    )
  }

  if (runs.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">No runs yet</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border p-1">
      {runs.map((run) => (
        <RunGroup
          key={run.id}
          run={run}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
