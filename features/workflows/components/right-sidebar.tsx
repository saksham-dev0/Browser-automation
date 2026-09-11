"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useReactFlow, useStoreApi, useStore } from "@xyflow/react"
import { Lock, MoreHorizontal, Play, Square, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResizablePanel } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { useProGate } from "@/features/billing/components/entitlement-provider"
import {
  cancelWorkflowRunAction,
  deleteWorkflowAction,
  runWorkflowAction,
} from "@/features/workflows/actions"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import {
  useUpstreamConnections,
  type UpstreamConnection,
} from "@/features/workflows/hooks/use-upstream-connections"

import {
  getNodeDefinition,
  nodeRegistry,
  type NodeDefinition,
  type NodeField,
  type NodeType,
  type StepNodeKind,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

import { NodeIcon } from "./node-icon"
import { useRunHistory } from "./workflow-runs-provider"

// This file builds up to the RightSidebar component exported at the bottom: a
// header with workflow actions (delete, run), then two tabs — a Toolbar for
// adding nodes and an Editor for tweaking the selected node. Each helper below is
// defined just above the block that uses it.

// ---------------------------------------------------------------------------
// Shared pieces — used by both the Toolbar and the Editor.
// ---------------------------------------------------------------------------

// A titled, scrollable panel. Each tab renders its content inside one.
function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-y border-border bg-card px-3 py-1.5 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor tab — edits the fields of the selected node.
// ---------------------------------------------------------------------------

// A single editor field for a node property. Fields marked multiline in the
// registry render as a textarea; everything else stays a single-line input.
type FieldControl = HTMLInputElement | HTMLTextAreaElement

function Field({
  field,
  value,
  onChange,
  onFocus,
  ref,
}: {
  field: NodeField
  value: string
  onChange: (value: string) => void
  // Fires when the field takes focus, so Connections knows where a clicked
  // chip's token should land.
  onFocus: () => void
  ref: (el: FieldControl | null) => void
}) {
  const Control = field.multiline ? Textarea : Input

  return (
    <Control
      id={field.key}
      ref={ref}
      value={value}
      placeholder={field.placeholder}
      className={cn(field.multiline && "min-h-24 resize-y")}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// The Connections list under the fields: every output produced upstream of this
// node, as a chip that drops its {{ }} token into the field being edited.
function Connections({
  connections,
  onInsert,
}: {
  connections: UpstreamConnection[]
  onInsert: (connection: UpstreamConnection) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-3">
      <Label className="text-xs">Connections</Label>
      <div className="flex flex-wrap gap-1.5">
        {connections.map((connection) => (
          <button
            key={connection.token}
            type="button"
            title={`Insert ${connection.token}`}
            // Keeps the focused field focused, so the token lands at the caret
            // the user left rather than at the end of the text.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(connection)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pr-2 pl-0.5 text-xs hover:bg-accent"
          >
            <NodeIcon type={connection.nodeType} className="size-4 rounded-full" />
            {connection.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// The Editor tab: one input per field on the selected node, or an empty state.
function Inspector({ node }: { node: StepNodeType | undefined }) {
  const {updateNodeData} = useReactFlow<StepNodeType>()
  const connections = useUpstreamConnections(node)

  // The rendered controls, so an inserted token can go in at the caret and the
  // field can keep focus afterwards.
  const controls = useRef(new Map<string, FieldControl>())
  // The field a chip inserts into: whichever was focused last, falling back to
  // the node's first field.
  const [activeKey, setActiveKey] = useState<string | null>(null)

  // Editing a different node starts the fallback over.
  const [prevNodeId, setPrevNodeId] = useState(node?.id)
  if (node?.id !== prevNodeId) {
    setPrevNodeId(node?.id)
    setActiveKey(null)
  }

  if (!node) {
    return (
      <Section title="Editor">
        <p className="p-3 text-sm text-muted-foreground">No node selected</p>
      </Section>
    )
  }

  const { type, title, values } = node.data
  const def: NodeDefinition = nodeRegistry[type]

  const setValue = (key: string, value: string) => {
    updateNodeData(node.id, { values: { ...values, [key]: value } })
  }

  // Splices a chip's token into the target field at its caret (or at the end,
  // when the field was never focused), then puts the caret after the token.
  const insert = ({ token }: UpstreamConnection) => {
    const key = activeKey ?? def.fields[0]?.key
    if (!key) return

    const value = values[key] ?? ""
    const control = controls.current.get(key)
    const start = control?.selectionStart ?? value.length
    const end = control?.selectionEnd ?? value.length

    setValue(key, value.slice(0, start) + token + value.slice(end))

    const caret = start + token.length
    requestAnimationFrame(() => {
      control?.focus()
      control?.setSelectionRange(caret, caret)
    })
  }

  return (
    <Section title={title} icon={<NodeIcon type={type} />}>
      <div className="flex flex-col gap-3 p-3">
        {def.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No properties</p>
        ) : (
          def.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-xs">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Field
                field={field}
                value={values[field.key] ?? ""}
                onChange={(value) => setValue(field.key, value)}
                onFocus={() => setActiveKey(field.key)}
                ref={(el) => {
                  if (el) controls.current.set(field.key, el)
                  else controls.current.delete(field.key)
                }}
              />
            </div>
          ))
        )}
        {connections.length > 0 && (
          <Connections connections={connections} onInsert={insert} />
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Toolbar tab — adds nodes to the canvas, grouped by kind.
// ---------------------------------------------------------------------------

// The Toolbar's groups, one accordion section per node kind.
const sections: { kind: StepNodeKind; label: string }[] = [
  { kind: "trigger", label: "Triggers" },
  { kind: "action", label: "Actions" },
]

// Every node type from the registry, filtered into the groups below.
const definitions: NodeDefinition[] = Object.values(nodeRegistry)

// Nodes of the same type are numbered so they stay easy to tell apart ("Open URL
// 1", "Open URL 2"). Numbering resumes after the highest number in use, so
// deleting a node never leaves two nodes sharing a title.
function nextTitle(nodes: StepNodeType[], type: NodeType) {
  const { label } = nodeRegistry[type]
  const highest = nodes.reduce((max, node) => {
    if (node.data.type !== type) return max
    const n = Number(node.data.title.slice(label.length + 1))
    return Number.isInteger(n) && n > max ? n : max
  }, 0)

  return `${label} ${highest + 1}`
}

// The Toolbar tab: a button per node type that adds it to the canvas.
function Palette() {
  // The canvas lives in a sibling subtree, so both read the same React Flow
  // store through the provider in the page. addNodes goes through
  // onNodesChange, which is how the new node reaches Liveblocks.
  const { addNodes, getNodes, getViewport } = useReactFlow<StepNodeType>()
  const store = useStoreApi()
  const { isPro, requirePro } = useProGate()

  const add = (type: NodeType) => {
    const def = getNodeDefinition(type)
    const nodes = getNodes()

    // Premium nodes cost real money to run, so a free org is sent to billing
    // instead of getting the node. `runWorkflowAction` enforces the same rule
    // server-side, where the plan cannot be forged.
    if (def.premium && !requirePro(`The ${def.label} node`)) return

    if (def.kind === "trigger" && nodes.some((n) => n.data.kind === "trigger")) {
      toast.error("A workflow can only have one trigger")
      return
    }

    // The middle of the viewport in flow coordinates. origin centers the node on
    // that point instead of hanging it off its top-left corner.
    const { width, height } = store.getState()
    const { x, y, zoom } = getViewport()

    addNodes({
      id: crypto.randomUUID(),
      type: "step",
      position: { x: (width / 2 - x) / zoom, y: (height / 2 - y) / zoom },
      origin: [0.5, 0.5],
      data: {
        type,
        kind: def.kind,
        title: nextTitle(nodes, type),
        values: {},
      },
    })
  }

  return (
    <Section title="Toolbar">
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => s.kind)}
        className="px-3 py-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.kind}
            value={section.kind}
            className="not-last:border-b-0"
          >
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5">
              {definitions
                .filter((def) => def.kind === section.kind)
                .map((def) => {
                  // Locked nodes stay clickable: the click is the upgrade prompt.
                  const locked = Boolean(def.premium) && !isPro

                  return (
                    <Button
                      key={def.type}
                      variant="ghost"
                      onClick={() => add(def.type as NodeType)}
                      className="justify-start gap-2.5 px-1.5 text-xs"
                      title={locked ? `${def.label} is a Pro feature` : undefined}
                    >
                      <NodeIcon
                        type={def.type as NodeType}
                        className={cn(locked && "opacity-50 grayscale")}
                      />
                      <span className={cn(locked && "text-muted-foreground")}>
                        {def.label}
                      </span>
                      {locked ? (
                        <Badge variant="outline" className="ml-auto gap-1 px-1.5">
                          <Lock />
                          Pro
                        </Badge>
                      ) : null}
                    </Button>
                  )
                })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Header — workflow-level actions shown above the tabs.
// ---------------------------------------------------------------------------

// The "..." menu for workflow-level actions.
function ActionsMenu({ workflowId }: { workflowId: string }) {
  const [isDeleting, startDeleting] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem
          variant="destructive"
          disabled={isDeleting}
          className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
          onSelect={(e) => {
            // Keep the menu open so the disabled item stays visible until the
            // action redirects away.
            e.preventDefault()

            startDeleting(async () => {
              // Removes the row and its Liveblocks room, then redirects home. The
              // redirect rejects this promise with a NEXT_REDIRECT error the
              // router handles, so it is deliberately left uncaught.
              await deleteWorkflowAction(workflowId)
            })
          }}
        >
          <Trash2 />
          Delete workflow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Kicks off a run of the current workflow, and cancels it while it is in
// flight. At most one run is live at a time, so the button is a plain toggle.
function RunButton({workflowId}: {workflowId: string}) {
  const {getNodes, getEdges} = useReactFlow<StepNodeType>()
  const [isPending, startTransition] = useTransition()
  const { runs } = useRunHistory()
  const router = useRouter()

  // The run that just started, until the realtime subscription catches up —
  // without it the button would flip back to Run for the moment between the
  // trigger resolving and the new run reaching the provider.
  const [startedId, setStartedId] = useState<string | null>(null)
  if (startedId && runs.some((run) => run.id === startedId)) {
    setStartedId(null)
  }

  const runId = runs.find((run) => run.isLive)?.id ?? startedId

  return (
    <Button
      size="sm"
      variant={runId ? "destructive" : "secondary"}
      disabled={isPending}
      onClick={() => {
        if (runId) {
          startTransition(async () => {
            await cancelWorkflowRunAction(runId)
          })
          return
        }

        const graph = { nodes: getNodes(), edges: getEdges() }
        const problems = validateGraph(graph)
        if (problems.length > 0) {
          toast.error(problems[0])
          return
        }

        startTransition(async () => {
          const result = await runWorkflowAction({ id: workflowId, graph })

          // A plan refusal comes back as a message rather than a run handle.
          if ("error" in result) {
            toast.error(result.error, {
              action: { label: "Upgrade", onClick: () => router.push("/billing") },
            })
            return
          }

          setStartedId(result.id)
        })
      }}
    >
      {runId ? (
        <>
          <Square fill="currentColor" />
          Stop
        </>
      ) : (
        <>
          <Play fill="primary" />
          Run
        </>
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// The sidebar itself — header on top, then the Toolbar / Editor tabs.
// ---------------------------------------------------------------------------

export function RightSidebar({ workflowId }: { workflowId: string }) {
  const [tab, setTab] = useState("toolbar")

  const selected = useStore((s) => s.nodes.find((n) => n.selected)) as StepNodeType | undefined

  // TODO: auto-switch to the Editor tab when the selection changes.
  const [prevSelectedId, setPrevSelectedId] = useState<string | undefined>(selected?.id)
  if (selected?.id !== prevSelectedId) {
    setPrevSelectedId(selected?.id)
    setTab("editor")
  }

  return (
    <ResizablePanel
      className="bg-background"
      defaultSize="16rem"
      minSize="14rem"
      maxSize="36rem"
      groupResizeBehavior="preserve-pixel-size"
    >
      <Tabs value={tab} onValueChange={setTab} className="size-full gap-0">
        <div className="flex items-center justify-between border-b border-border p-2">
          <ActionsMenu workflowId={workflowId} />
          <RunButton workflowId={workflowId} />
        </div>
        <TabsList className="m-2 w-fit bg-background">
          <TabsTrigger
            value="toolbar"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Toolbar
          </TabsTrigger>
          <TabsTrigger
            value="editor"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Editor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="toolbar" className="flex min-h-0 flex-col">
          <Palette />
        </TabsContent>
        <TabsContent value="editor" className="flex min-h-0 flex-col">
          <Inspector node={selected} />
        </TabsContent>
      </Tabs>
    </ResizablePanel>
  )
}