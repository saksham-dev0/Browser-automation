"use client"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import {
  nodeRegistry,
  type NodeType,
} from "@/features/workflows/nodes/node-registry"

// The accent-colored icon chip, mirroring the node on the canvas. Shared by the
// sidebar's toolbar and editor and by the run console's step rows.
export function NodeIcon({
  type,
  running,
  className,
}: {
  type: NodeType
  // Swaps the icon for a spinner while the node's step is executing, so the
  // chip keeps its accent instead of collapsing to a bare spinner.
  running?: boolean
  className?: string
}) {
  const def = nodeRegistry[type]
  const Icon = def.icon
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        def.accent,
        className
      )}
    >
      {running ? <Spinner className="size-3.5" /> : <Icon className="size-3.5" />}
    </span>
  )
}
