import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { getWorkflow } from "@/features/workflows/data"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import { Stagehand } from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import { interpolate } from "@/features/workflows/lib/interpolate"


// One entry per node the run will walk, published to the run's metadata under
// "steps" so the canvas — and the run console below it — can watch each node
// move through its lifecycle live and inspect what it produced.
export type RunStep = {
  nodeId: string
  // The node's registry type (for its icon/accent) and title, denormalized so
  // the console can render a step without re-reading the graph.
  type: NodeType
  title: string
  status: "pending" | "running" | "done" | "failed"
  // Wall-clock time the executor took, set once the step leaves "running".
  durationMs?: number
  // Whatever the executor returned, kept for the console's per-step detail view.
  output?: unknown
  // The thrown error's message, set only when status is "failed".
  error?: string
}

// The Trigger.dev task the Run button fires. It loads the saved graph, works out
// what order the nodes should run in, and walks them. For now each node just
// announces itself — real execution (per-node executors, live progress, browser
// sessions) gets layered on from here.
export const runWorkflowTask = task({
  id: "run-workflow",
  run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow?.graph) throw new Error(`Workflow ${workflowId} has no graph`)

    const { nodes, edges } = workflow.graph
    const byId = new Map(nodes.map((n) => [n.id, n]))

    // Run only connected nodes — anything touching an edge. Orphans dropped on
    // the canvas are skipped. toposort orders them and throws on a cycle.
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target])
      )
      .filter((id) => connected.has(id))

    logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

    // Build the step list up front so the canvas can render the whole run —
    // every node greyed out as "pending" — before any work starts.
    const steps: RunStep[] = order.map((id) => {
      const node = byId.get(id)!
      return {
        nodeId: id,
        type: node.data.type,
        title: node.data.title,
        status: "pending",
      }
    })
    // Steps carry an arbitrary executor `output`, which TypeScript can't prove
    // is JSON-safe — the run's own return value has the same shape, so a single
    // cast here keeps every publish site clean.
    const publishSteps = () =>
      metadata.set("steps", steps as unknown as Parameters<typeof metadata.set>[1])
    publishSteps()

    // The browser session is created lazily — a graph with no browser nodes
    // should never pay for a Browserbase session.
    //
    // v3, not v4, on purpose: with env "BROWSERBASE" every act/extract/observe
    // and the whole agent loop execute server-side on Browserbase, which is what
    // fills the Stagehand tab of the session inspector. v4 runs them in a
    // browser-side worker driven from this process, and Browserbase never sees
    // them.
    let stagehand: Stagehand | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand
      const instance = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        // No provider key, so inference routes through Browserbase's Model
        // Gateway and bills to the Browserbase key.
        model: "google/gemini-2.5-flash",
        verbose: 1,
        logger: (line) => {
          logger.log(`[stagehand] ${line.message}`, {
            category: line.category,
            ...line.auxiliary,
          })
        },
      })
      await instance.init()
      stagehand = instance
      // Surfaced on the run so the UI can deep-link to the live session replay.
      if (instance.browserbaseSessionID) {
        metadata.set("browserbaseSessionId", instance.browserbaseSessionID)
      }
      return instance
    }

    // Every executed node's result, keyed by node id, so a later node can pull
    // an earlier one's data through a {{ nodeId.path }} placeholder. Safe to
    // read as we go: the toposort above guarantees anything referenced already
    // ran.
    const outputs: Record<string, unknown> = {}

    try {
      for (const [index, id] of order.entries()) {
        const node = byId.get(id)!
        logger.log(`Running Step: ${node.data.title}`)
        const executor = nodeExecutors[node.data.type]
        if (!executor) continue

        const values = Object.fromEntries(
          Object.entries(node.data.values).map(([key, value]) => [
            key,
            interpolate(value, outputs),
          ])
        )

        steps[index] = { ...steps[index], status: "running" }
        publishSteps()
        // Force the "running" state out now. Metadata is otherwise flushed on a
        // background timer, so a fast executor would overwrite this with "done"
        // before it ever left the run — and the canvas would never spin.
        await metadata.flush()

        const startedAt = Date.now()
        try {
          const output = await executor({ values, getStagehand })
          outputs[id] = output
          steps[index] = {
            ...steps[index],
            status: "done",
            durationMs: Date.now() - startedAt,
            output,
          }
          publishSteps()
        } catch (error) {
          steps[index] = {
            ...steps[index],
            status: "failed",
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          }
          publishSteps()
          // A thrown run returns no output, so this flush is the only way the
          // failed state ever reaches the canvas.
          await metadata.flush()
          throw error
        }
      }
    } finally {
      // Closing tears down the Browserbase session too. It can throw on an
      // already-dropped socket, and that must not fail a run whose steps all
      // succeeded — nor cost a retry, and another session, to do it again.
      try {
        await stagehand?.close()
      } catch (error) {
        logger.warn("Failed to close the Stagehand session", {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { steps }
  },
})
