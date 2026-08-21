"use client"

import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { CheckCircle2Icon, LoaderIcon, XCircleIcon } from "lucide-react"

import { Progress } from "@/components/ui/progress"

import type { helloWorldTask } from "@/trigger/example"

const TERMINAL_STATUSES = [
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
]

export function RunStatus({
  runId,
  accessToken,
  onFinished,
}: {
  runId: string
  accessToken: string
  onFinished?: () => void
}) {
  const { run, error } = useRealtimeRun<typeof helloWorldTask>(runId, {
    accessToken,
    skipColumns: ["payload"],
    onComplete: () => onFinished?.(),
  })

  if (error) {
    return (
      <p className="text-sm text-destructive">Realtime error: {error.message}</p>
    )
  }

  if (!run) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderIcon className="size-4 animate-spin" />
        Connecting&hellip;
      </p>
    )
  }

  const status = (run.metadata?.status as string | undefined) ?? run.status
  const progress = (run.metadata?.progress as number | undefined) ?? 0
  const isDone = TERMINAL_STATUSES.includes(run.status)
  const isFailed = isDone && run.status !== "COMPLETED"

  return (
    <div className="w-full space-y-2">
      <p className="flex items-center gap-2 text-sm">
        {!isDone ? (
          <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
        ) : isFailed ? (
          <XCircleIcon className="size-4 text-destructive" />
        ) : (
          <CheckCircle2Icon className="size-4 text-green-600" />
        )}
        <span className="truncate">{status}</span>
      </p>

      {!isDone && <Progress value={progress} />}

      {isFailed && run.error && (
        <p className="text-xs text-destructive">{run.error.message}</p>
      )}

      {run.status === "COMPLETED" && run.output && (
        <p className="text-xs text-muted-foreground">{run.output.message}</p>
      )}

      <p className="font-mono text-xs text-muted-foreground">{run.id}</p>
    </div>
  )
}
