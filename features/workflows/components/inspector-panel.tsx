"use client"

import { NodeIcon } from "./node-icon"
import type { StepSelection } from "./logs-panel"
import { useRunHistory } from "./workflow-runs-provider"

/**
 * The console's detail pane: what the selected step produced — its output as
 * formatted JSON, or the error it threw. Rendered only while a step is
 * selected, so it always has a selection to resolve.
 */
export function InspectorPanel({ selection }: { selection: StepSelection }) {
  const { runs } = useRunHistory()

  const step = runs
    .find((run) => run.id === selection.runId)
    ?.steps.find((s) => s.nodeId === selection.nodeId)

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
        <pre className="whitespace-pre-wrap break-words p-3 text-xs text-destructive">
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
        <pre className="p-3 font-mono text-xs whitespace-pre-wrap break-words">
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
