"use client"

import { useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PlusIcon, WorkflowIcon } from "lucide-react"
import { toast } from "sonner"

import {
  workflowLimitMessage,
  type WorkflowLimit,
} from "@/features/workflows/lib/workflow-limit"
import type { Workflow } from "@/lib/db/schema"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

type CreateWorkflowAction = (name: string) => Promise<{ error: string } | void>

function WorkflowList({ workflows }: { workflows: Workflow[] }) {
  const pathname = usePathname()

  return (
    <SidebarMenu className="gap-y-0.5">
      {workflows.map((workflow) => (
        <SidebarMenuItem key={workflow.id}>
          <SidebarMenuButton
            asChild
            isActive={pathname === `/workflows/${workflow.id}`}
          >
            <Link href={`/workflows/${workflow.id}`}>
              <span>{workflow.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

/** Shown only on capped plans, so Pro sees nothing. */
function WorkflowUsage({ limit }: { limit: WorkflowLimit }) {
  if (limit.limit === null) return null

  return (
    <p className="px-2 text-xs text-muted-foreground">
      {limit.used} of {limit.limit} workflows used&nbsp;·&nbsp;
      <Link href="/billing" className="underline underline-offset-2">
        Upgrade
      </Link>
    </p>
  )
}

export function WorkflowNav({
  workflows,
  workflowLimit,
  createWorkflowAction,
}: {
  workflows: Workflow[]
  workflowLimit: WorkflowLimit
  createWorkflowAction: CreateWorkflowAction
}) {
  const router = useRouter()
  const { state, isMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    startTransition(async () => {
      // On success the action redirects, so only a refusal returns here.
      const result = await createWorkflowAction(generateSlug())

      if (result?.error) {
        toast.error(result.error, {
          action: { label: "Upgrade", onClick: () => router.push("/billing") },
        })
      }
    })
  }

  const atLimit = !workflowLimit.canCreate

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton tooltip="Workflows">
                    <WorkflowIcon />
                    <span className="sr-only">Workflows</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="right" align="start">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={handleCreate}
                        disabled={isPending || atLimit}
                        tooltip={atLimit ? workflowLimitMessage(workflowLimit) : undefined}
                      >
                        <PlusIcon />
                        <span>New workflow</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                  <SidebarSeparator />
                  <WorkflowList workflows={workflows} />
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workflows</SidebarGroupLabel>
      <SidebarGroupAction
        title={atLimit ? workflowLimitMessage(workflowLimit) : "New workflow"}
        onClick={handleCreate}
        disabled={isPending || atLimit}
      >
        <PlusIcon />
        <span className="sr-only">New workflow</span>
      </SidebarGroupAction>
      <SidebarGroupContent className="flex flex-col gap-2">
        <WorkflowList workflows={workflows} />
        <WorkflowUsage limit={workflowLimit} />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
