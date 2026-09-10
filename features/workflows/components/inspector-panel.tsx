"use client"

import { PlayIcon } from "lucide-react"

import { NodeIcon } from "./node-icon"
import { SessionReplay } from "./session-replay"
import type { ConsoleSelection } from "./logs-panel"
import { useRunHistory } from "./workflow-runs-provider"

/**
 * The console's detail pane: what the selection produced — a step's output as
 * formatted JSON or the error it threw, or the browser recording of a whole
 * run. Rendered only while something is selected, so it always has a selection
 * to resolve.
 */
export function InspectorPanel({ selection }: { selection: ConsoleSelection }) {
  const { runs } = useRunHistory()

  const run = runs.find((candidate) => candidate.id === selection.runId)

  if (selection.kind === "replay") {
    // The row is only offered for a run that has a session id, so a missing one
    // here means the run itself aged out of the realtime window.
    if (!run?.browserbaseSessionId) {
      return (
        <Frame title="Replay">
          <Note>Recording is no longer available</Note>
        </Frame>
      )
    }

    return (
      <Frame title="Replay" icon={<PlayIcon className="size-3.5" />}>
        <div className="p-3">
          <SessionReplay sessionId={run.browserbaseSessionId} />
        </div>
      </Frame>
    )
  }

  const step = run?.steps.find((s) => s.nodeId === selection.nodeId)

  // The selected run can drop out of the realtime window while its step is
  // open, so a missing step is a normal state rather than a bug.
  if (!step) {
    return (
      <Frame>
        <Note>Step is no longer available</Note>
      </Frame>
    )
  }

  return (
    <Frame title={step.title} icon={<NodeIcon type={step.type} />}>
      {step.error ? (
        <pre className="p-3 text-xs break-words whitespace-pre-wrap text-destructive">
          {step.error}
        </pre>
      ) : step.output === undefined ? (
        <Note>
          {step.status === "pending"
            ? "This step hasn't run"
            : step.status === "running"
              ? "Still running"
              : "No output"}
        </Note>
      ) : (
        <pre className="p-3 font-mono text-xs break-words whitespace-pre-wrap">
          {JSON.stringify(step.output, null, 2)}
        </pre>
      )}
    </Frame>
  )
}

function Frame({
  title,
  icon,
  children,
}: {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex size-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-xs font-semibold">
        {icon}
        {title ?? "Output"}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="p-3 text-xs text-muted-foreground">{children}</p>
}
