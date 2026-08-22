"use client"

import { useSyncExternalStore } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ConnectionLineType,
  type Edge,
  NodeTypes,
} from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import { useTheme } from "next-themes"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

import { StepNode } from "@/features/workflows/components/step-node"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

const nodeTypes: NodeTypes = { step: StepNode }

const initialNodes: StepNodeType[] = [
  {
    id: "start",
    type: "step",
    position: { x: 0, y: 0 },
    data: { type: "start", kind: "trigger", title: "Start", values: {} },
  },
]

const initialEdges: Edge[] = []

const emptySubscribe = () => () => {}
const getMountedSnapshot = () => true
const getServerSnapshot = () => false

/** false during server render and hydration, true after mount. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    getMountedSnapshot,
    getServerSnapshot,
  )
}

export function Canvas() {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const colorMode = mounted && resolvedTheme === "dark" ? "dark" : "light"
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
  } = useLiveblocksFlow<StepNodeType, Edge>({
    suspense: true,
    nodes: { initial: initialNodes },
    edges: { initial: initialEdges },
  })

  return (
    <div className="size-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        colorMode={colorMode}
        fitView
        proOptions={{ hideAttribution: false }}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--border)"}}
        defaultEdgeOptions={{ 
          type: "smoothstep",
          style: { stroke: "var(--border)" } 
        }}
        style={
          {
            "--xy-background-color": "var(--background)",
            "--xy-edge-stroke-width": 2,
            "--xy-connection-line-stroke-width": 2,
          } as React.CSSProperties
        }
        maxZoom={1}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <Cursors />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
