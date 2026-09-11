import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Lock } from "lucide-react"

import { useProGate } from "@/features/billing/components/entitlement-provider"
import {
  getNodeDefinition,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { useLatestRunSteps } from "./workflow-runs-provider"

function StepNodeComponent({ id, data, selected }: NodeProps<StepNodeType>) {
  const { type, kind, title, values } = data
  const def = getNodeDefinition(type)
  const Icon = def.icon
  const fields = def.fields.filter((field) => values[field.key])

  const { isPro } = useProGate()
  // A premium node left behind by a lapsed subscription. It stays on the canvas
  // and keeps its data; it just cannot run until the org upgrades.
  const locked = Boolean(def.premium) && !isPro

  const { steps, isLive } = useLatestRunSteps()
  const status = steps.find((step) => step.nodeId === id)?.status
  // A crashed or cancelled run can leave a node stuck on "running" — once the
  // run is over, nothing is executing, so stop the spinner.
  const isRunning = status === "running" && isLive
  const isFailed = status === "failed"

  // A trigger starts the flow and takes no input, so it has no target handle.
  const hasTarget = kind !== "trigger"

  return (
    <div
      className={cn(
        "min-w-50 max-w-80 rounded-(--radius) border-2 border-border bg-card text-card-foreground",
        isRunning && "border-blue-500",
        isFailed && "border-destructive",
        locked && "border-dashed opacity-60",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
    >
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ transform: "translate(-100%, -50%)" }}
          className="h-3.5! w-1.5! min-w-0! rounded-l-xs! rounded-r-none! border-0! bg-border!"
        />
      )}

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            def.accent
          )}
        >
          {isRunning ? <Spinner className="size-4" /> : <Icon className="size-4" />}
        </div>
        <span className="text-sm font-semibold">{title}</span>
        {locked && (
          <span
            title={`${def.label} is a Pro feature. Upgrade to run this workflow.`}
            className="ml-auto flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            <Lock className="size-2.5" />
            Pro
          </span>
        )}
      </div>

      {fields.length > 0 && (
        <>
          <div className="border-t border-border" />
          <div className="flex flex-col gap-1.5 px-3 py-2.5">
            {fields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <span className="shrink-0 text-muted-foreground">{field.label}</span>
                <span className="truncate font-medium">{values[field.key]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ transform: "translate(100%, -50%)" }}
        className="h-3.5! w-1.5! min-w-0! rounded-l-none! rounded-r-xs! border-0! bg-border!"
      />
    </div>
  )
}

export const StepNode = memo(StepNodeComponent)