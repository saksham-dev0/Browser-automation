"use client"

import { useMemo } from "react"
import { useNodesData, useStore } from "@xyflow/react"

import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

// One insertable reference to a single output of one upstream node.
export type UpstreamConnection = {
  // The text to drop into a field, e.g. "{{ 7f3a…c1.title }}".
  token: string
  // What to show the user instead of the id, e.g. "Open URL 1 · Title".
  label: string
  // The producing node, so callers can render its icon/accent from the registry.
  nodeId: string
  nodeType: NodeType
}

// Walks the graph backwards from `nodeId` and returns every node that can reach
// it — direct parents, their parents, and so on. Breadth-first, so the nearest
// producers come first; the seen set also makes a cycle terminate.
function upstreamIdsOf(
  nodeId: string,
  edges: { source: string; target: string }[]
): string[] {
  const parentsOf = new Map<string, string[]>()
  for (const { source, target } of edges) {
    parentsOf.set(target, [...(parentsOf.get(target) ?? []), source])
  }

  const ids: string[] = []
  const seen = new Set([nodeId])
  const queue = [nodeId]

  while (queue.length) {
    for (const parent of parentsOf.get(queue.shift()!) ?? []) {
      if (seen.has(parent)) continue
      seen.add(parent)
      ids.push(parent)
      queue.push(parent)
    }
  }

  return ids
}

/**
 * Every output produced anywhere upstream of `node`, ready to insert into one of
 * its fields as a {{ nodeId.path }} token. Because the runner walks the graph in
 * dependency order, anything listed here has already produced its output by the
 * time `node` runs.
 *
 * Recomputes as edges are connected and disconnected, and as upstream nodes are
 * renamed — but not while nodes are being dragged.
 *
 * @example
 * const connections = useUpstreamConnections(selected)
 * // [{ token: "{{ abc.title }}", label: "Open URL 1 · Title", ... }]
 */
export function useUpstreamConnections(
  node: StepNodeType | undefined
): UpstreamConnection[] {
  // Subscribing to the edges alone keeps drags out of this: the store swaps the
  // edges array only when a connection actually changes.
  const edges = useStore((s) => s.edges)

  const upstreamIds = useMemo(
    () => (node ? upstreamIdsOf(node.id, edges) : []),
    [node, edges]
  )

  // Reads only the id/type/data of those nodes, so positions moving don't
  // re-render the caller — but a retitled upstream node does.
  const upstream = useNodesData<StepNodeType>(upstreamIds)

  return useMemo(
    () =>
      upstream.flatMap((n) =>
        nodeRegistry[n.data.type].outputs.map((output) => ({
          token: `{{ ${n.id}.${output.path} }}`,
          label: `${n.data.title} · ${output.label}`,
          nodeId: n.id,
          nodeType: n.data.type,
        }))
      ),
    [upstream]
  )
}
