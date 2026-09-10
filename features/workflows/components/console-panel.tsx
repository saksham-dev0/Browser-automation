"use client"

import { useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { InspectorPanel } from "./inspector-panel"
import { LogsPanel, isSameSelection, type ConsoleSelection } from "./logs-panel"

/**
 * The console under the canvas. It owns what is selected — a step or a run's
 * replay, one at a time — so the runs list and the output view beside it stay
 * in agreement. Clicking a row opens it, clicking the same one again closes
 * it.
 */
export function ConsolePanel() {
  const [selected, setSelected] = useState<ConsoleSelection | null>(null)

  const toggle = (selection: ConsoleSelection) =>
    setSelected((current) =>
      isSameSelection(current, selection) ? null : selection
    )

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
