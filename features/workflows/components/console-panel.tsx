"use client"

import { useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { InspectorPanel } from "./inspector-panel"
import { LogsPanel, isSameStep, type StepSelection } from "./logs-panel"

/**
 * The console under the canvas. It owns which step is selected — clicking a
 * step opens it, clicking the same one again closes it — so the runs list and
 * the output view beside it stay on the same step.
 */
export function ConsolePanel() {
  const [selected, setSelected] = useState<StepSelection | null>(null)

  const toggle = (selection: StepSelection) =>
    setSelected((current) => (isSameStep(current, selection) ? null : selection))

  return (
    <ResizablePanelGroup orientation="horizontal" className="size-full">
      <ResizablePanel minSize="16rem" className="overflow-y-auto">
        <LogsPanel selected={selected} onSelect={toggle} />
      </ResizablePanel>
      {/* Deselecting unmounts the inspector, and the logs take the full width
          back — the group re-lays out around whatever panels are mounted. */}
      {selected && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="24rem" minSize="14rem">
            <InspectorPanel selection={selected} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
